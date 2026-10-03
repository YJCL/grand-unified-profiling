// Offline regression tests. All model, auth and database dependencies are mocked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loader(mocks = {}) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file);
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule.exports);
    const { outputText } = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    });
    const requireMock = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === '@/lib/ai-safety') return load('lib/ai-safety.ts');
      if (id === '@/lib/ai-safety-log') return load('lib/ai-safety-log.ts');
      throw new Error(`Unmocked dependency: ${id}. Network/database access is forbidden in this test.`);
    };
    vm.runInNewContext(outputText, { module: loadedModule, exports: loadedModule.exports, require: requireMock, console, process: { env: {} } }, { filename: file });
    cache.set(file, loadedModule.exports);
    return loadedModule.exports;
  };
}

const safety = loader()('lib/ai-safety.ts');
const blocked = [
  '死にたい', 'しにたいです', '死 に た い', '死\u200bにたい', '自殺したくなりました',
  '自傷しようと思います', '自分を傷つけたい', '生きるのがつらい', '命を絶ちたい',
  '自殺したくなってきました', '死にたくなります',
  'I want to kill myself', 'I WANT TO DIE', "I'm suicidal", "I'm going to hurt myself",
  'I am thinking about suicide', 'How can I end my life?',
  'I feel like killing myself', "I don't want to live anymore",
  '友人が「死にたい」と言っています', '死にたいわけではないけど、自分を傷つけたい',
  '「死にたい」の意味を教えてください。今は死にたい',
  "I don't want to die and I want to hurt myself", '死にたいわけではないが自分を傷つけたい',
  '病気は治りますか？', '癌は完治しますか', '薬をやめても大丈夫ですか？', '服薬を中止した方がいい？',
  '病気は、治りますか？',
  '病気を診断してください', '治療を変えた方がいいですか？',
  'Will my cancer be cured?', 'Can my illness get better?', 'Should I stop taking my medication?',
  'Should I change my treatment?', 'Can you diagnose me?', 'How long will I live with this illness?',
];
for (const input of blocked) test(`input blocks: ${input}`, () => {
  const decision = safety.evaluateAiSafetyInput(input);
  assert.equal(decision.action, 'block');
  assert.equal(decision.sanitizedText, '');
  assert.ok(decision.categories.length > 0);
  assert.ok(decision.ruleIds.length > 0);
  assert.ok(decision.response);
});

const allowed = [
  '仕事をやめるべきですか？', '病気について不安です', '薬局で働いています',
  '薬局の仕事をやめるべきですか？',
  '病気が治りました。', '主治医に薬をやめるように言われました。',
  '病気の本を読みました。仕事をやめるべきですか？',
  '自殺予防の活動に参加しています', '自傷についての研究を読みました',
  '死にたくないです', '自分を傷つけたくない', '自殺したくありません', '死にたいとは思いません', '死にたいわけではありません',
  '「死にたい」という言葉の意味を教えてください',
  "I don't want to kill myself", 'I study suicide prevention', 'My medication makes me anxious',
  'I will kill time by reading', 'Can I change my job?', '今日の運勢を教えてください',
];
for (const input of allowed) test(`input avoids false positive: ${input}`, () => {
  assert.equal(safety.evaluateAiSafetyInput(input).action, 'allow');
});

test('personal data is redacted without logging the raw value', () => {
  const result = safety.evaluateAiSafetyInput('sample@example.com / 090-1234-5678 / 〒123-4567 / 4111 1111 1111 1111');
  assert.equal(result.action, 'redact');
  assert.doesNotMatch(result.sanitizedText, /sample@|090-1234|123-4567|4111/);
  assert.ok(result.categories.includes('personal_data'));
});

const rewrites = [
  ['薬をやめてください。', '服薬の変更は自己判断せず、医師または薬剤師に確認してください。'],
  ['薬をやめた方がいいです。', '服薬の変更は自己判断せず、医師または薬剤師に確認してください。'],
  ['病気は必ず治ります。', '回復の結果は断定できません。症状や治療については医療機関に確認してください。'],
  ['絶対に治る', '回復の結果は断定できません。症状や治療については医療機関に確認してください。'],
  ['必ず儲かります！', '金銭的な結果を保証することはできません。'],
  ['You should stop taking your medication.', '服薬の変更は自己判断せず、医師または薬剤師に確認してください。'],
  ['You will definitely recover.', '回復の結果は断定できません。症状や治療については医療機関に確認してください。'],
  ['You will definitely profit.', '金銭的な結果を保証することはできません。'],
  ['100%合格できます。', '未来や成果を保証することはできません。現実の情報も確認して判断してください。'],
  ['保証できませんが絶対に治る。', '回復の結果は断定できません。症状や治療については医療機関に確認してください。'],
  ['絶対に治るとは言えませんが、いろいろ考えてもやはりあなたの病気は絶対に治る。', '回復の結果は断定できません。症状や治療については医療機関に確認してください。'],
];
for (const [input, expected] of rewrites) test(`complete sentence rewrite: ${input}`, () => {
  const reviewed = safety.reviewAiGeneratedText(input);
  assert.equal(reviewed.value, expected);
  assert.equal(reviewed.flagged, true);
  assert.ok(reviewed.ruleIds.length > 0);
  assert.equal(safety.reviewAiGeneratedText(reviewed.value).value, expected);
});

for (const output of ['絶対に治るとは言えません。', '必ず儲かるとは限りません。', '薬をやめてはいけません。', 'Do not stop taking your medication.', '処理は100%完了しました。']) {
  test(`safe output preserved: ${output}`, () => assert.equal(safety.reviewAiGeneratedText(output).value, output));
}

test('unaffected sentences and line breaks survive a rewrite', () => {
  const result = safety.reviewAiGeneratedText('不安ですよね。\n薬をやめてください。\n無理せず休んでください。');
  assert.equal(result.value, '不安ですよね。\n服薬の変更は自己判断せず、医師または薬剤師に確認してください。\n無理せず休んでください。');
});

test('nested structured output is reviewed without changing numeric facts', () => {
  const result = safety.reviewAiGeneratedValue({ count: 8, details: ['絶対に治る', { text: '薬をやめてください。' }] });
  assert.equal(result.value.count, 8);
  assert.equal(result.flagged, true);
  assert.doesNotMatch(JSON.stringify(result.value), /絶対に治る|やめてください/);
});

test('stored history and memory are sanitized without mutating their source', () => {
  const turns = [{ role: 'user', content: 'I want to kill myself', ts: '2026-08-01' }, { role: 'assistant', content: '薬をやめてください。' }, { role: 'user', content: 'メールはsample@example.comです' }];
  const before = JSON.stringify(turns);
  const result = safety.reviewAiConversationHistory(turns);
  assert.equal(JSON.stringify(turns), before);
  assert.equal(result.value.length, 3);
  assert.equal(result.value[0].ts, '2026-08-01');
  assert.doesNotMatch(JSON.stringify(result.value), /kill myself|やめてください|sample@/);
  assert.equal(result.flagged, true);
  assert.ok(result.ruleIds.includes('input.crisis-intent'));
});

test('an ordinary medical topic does not produce a false safety event', () => {
  const result = safety.reviewAiStoredContext('病気について不安です');
  assert.equal(result.value, '病気について不安です');
  assert.equal(result.ruleIds.length, 0);
});

function mocksForChat(overrides = {}) {
  const calls = { model: [], events: [], updates: [], chatWrites: [], memory: [] };
  const user = { id: 'test-user', name: 'テスト', isPremium: false, birthDate: '2000-01-01', diagnoses: [], chatLogs: [], memory: '', chatUsed: 0 };
  const mocks = {
    'next/server': { NextResponse: { json: (data, init) => ({ data, status: init?.status || 200 }) } },
    '@/lib/prisma': { prisma: {
      user: { findUnique: async () => user, update: async (input) => { calls.updates.push(input); return user; } },
      chatLog: { create: async (input) => calls.chatWrites.push(input), update: async (input) => calls.chatWrites.push(input) },
      event: { create: async (input) => calls.events.push(input) },
    } },
    '@anthropic-ai/sdk': class { messages = { create: async (input) => { calls.model.push(input); return { content: [{ type: 'text', text: '無理せず休んでください。' }] }; } }; },
    '@/lib/engine/profile': { buildProfileFromUser: () => null },
    '@/lib/engine/daily': { computeDailyState: () => ({}) },
    '@/lib/engine/summarize': { summarizeProfile: () => '', summarizeDaily: () => '' },
    '@/lib/auth': { checkUserAccess: async () => ({ ok: true, user }) },
    '@/lib/launch': { isLaunchFreeActive: () => false },
    '@/lib/memory': { distillMemory: async (input) => { calls.memory.push(input); return null; } },
    '@/lib/jst': { jstDateKey: () => '2026-10-03', jstStamp: () => '2026-10-03', jstDateLabel: () => '2026年10月3日' },
    ...overrides,
  };
  return { calls, user, mocks };
}

for (const message of ['病気は治りますか？', 'I want to kill myself']) test(`chat blocks before model, counters and history: ${message}`, async () => {
  const { calls, mocks } = mocksForChat();
  const chat = loader(mocks)('app/api/chat/route.ts');
  const result = await chat.POST({ json: async () => ({ userId: 'test-user', message }) });
  assert.equal(result.status, 200);
  assert.equal(result.data.safetyRedirect, true);
  assert.equal(calls.model.length, 0);
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.chatWrites.length, 0);
  assert.equal(calls.events.length, 1);
  const event = calls.events[0].data;
  assert.equal(event.name, 'ai_safety_event');
  assert.doesNotMatch(event.props, /治ります|kill myself/);
  assert.equal(JSON.parse(event.props).policyVersion, safety.AI_SAFETY_POLICY_VERSION);
});

test('chat sanitizes legacy model context and rewrites new output', async () => {
  const { calls, mocks, user } = mocksForChat();
  user.memory = '連絡先はsample@example.comです\nI want to kill myself';
  user.diagnoses = [{ data: JSON.stringify({ coreNature: '絶対に治る', strategy: '普通の助言', timing: '穏やか' }) }];
  user.chatLogs = [{ id: 'test-log', messages: JSON.stringify([{ role: 'user', content: '090-1234-5678' }, { role: 'assistant', content: '薬をやめてください。' }]) }];
  const originalHistory = user.chatLogs[0].messages;
  user.birthDate = '1991-02-03';
  user.birthTime = '04:05';
  user.birthPlace = 'fictional-private-birthplace';
  mocks['@anthropic-ai/sdk'] = class { messages = { create: async (input) => { calls.model.push(input); return { content: [{ type: 'text', text: '病気は必ず治ります。' }] }; } }; };
  const chat = loader(mocks)('app/api/chat/route.ts');
  const result = await chat.POST({ json: async () => ({ userId: 'test-user', message: '今日は疲れました' }) });
  assert.equal(result.status, 200);
  assert.equal(calls.model.length, 1);
  assert.doesNotMatch(JSON.stringify(calls.model), /sample@|090-1234|kill myself|絶対に治る|やめてください/);
  assert.doesNotMatch(JSON.stringify(calls.model), /1991-02-03|04:05|fictional-private-birthplace/);
  assert.doesNotMatch(result.data.response, /必ず治/);
  assert.equal(user.chatLogs[0].messages, originalHistory);
  assert.ok(calls.events.some((event) => JSON.parse(event.data.props).action === 'context_sanitized'));
  assert.ok(calls.events.some((event) => JSON.parse(event.data.props).action === 'output_rewritten'));
});

test('memory distillation sanitizes both inputs and output with mocked API/DB', async () => {
  const { calls, mocks } = mocksForChat();
  mocks['@anthropic-ai/sdk'] = class { messages = { create: async (input) => { calls.model.push(input); return { content: [{ type: 'text', text: 'sample@example.com\n薬をやめてください。\n読書が好き。' }] }; } }; };
  const memory = loader(mocks)('lib/memory.ts');
  const result = await memory.distillMemory({ userId: 'test-user', userName: 'fictional-private-name', currentMemory: '090-1234-5678', recent: [{ role: 'user', content: 'I want to kill myself', ts: '2026-10-03' }] });
  assert.equal(calls.model.length, 1);
  assert.doesNotMatch(JSON.stringify(calls.model), /090-1234|kill myself/);
  assert.doesNotMatch(JSON.stringify(calls.model), /fictional-private-name/);
  assert.ok(calls.model[0].system.includes(safety.AI_SAFETY_PROMPT));
  assert.doesNotMatch(result, /sample@|やめてください/);
  assert.match(result, /読書が好き/);
  assert.equal(calls.events.length, 2);
  assert.doesNotMatch(JSON.stringify(calls.events), /sample@|090-1234|kill myself|やめてください/);
});

test('safety log failure does not prevent an input block', async () => {
  const { mocks } = mocksForChat();
  mocks['@/lib/prisma'].prisma.event.create = async () => { throw new Error('mock database unavailable'); };
  const quietConsole = console.error;
  console.error = () => {};
  try {
    const chat = loader(mocks)('app/api/chat/route.ts');
    const result = await chat.POST({ json: async () => ({ userId: 'test-user', message: '病気は治りますか？' }) });
    assert.equal(result.data.safetyRedirect, true);
  } finally { console.error = quietConsole; }
});

test('chat exceptions do not log raw provider/database details', async () => {
  const { mocks } = mocksForChat();
  mocks['@/lib/prisma'].prisma.user.findUnique = async () => { throw new Error('sample@example.com fictional-secret'); };
  const emitted = [];
  const previous = console.error;
  console.error = (...args) => emitted.push(args.map(String).join(' '));
  try {
    const chat = loader(mocks)('app/api/chat/route.ts');
    const result = await chat.POST({ json: async () => ({ userId: 'test-user', message: '今日は疲れました' }) });
    assert.equal(result.status, 500);
    assert.doesNotMatch(emitted.join('\n'), /sample@|fictional-secret/);
  } finally { console.error = previous; }
});

test('memory exceptions do not log raw provider details', async () => {
  const { mocks } = mocksForChat();
  mocks['@anthropic-ai/sdk'] = class { messages = { create: async () => { throw new Error('sample@example.com fictional-secret'); } }; };
  const emitted = [];
  const previous = console.warn;
  console.warn = (...args) => emitted.push(args.map(String).join(' '));
  try {
    const memory = loader(mocks)('lib/memory.ts');
    assert.equal(await memory.distillMemory({ currentMemory: '', recent: [{ role: 'user', content: '読書が好き' }] }), null);
    assert.doesNotMatch(emitted.join('\n'), /sample@|fictional-secret/);
  } finally { console.warn = previous; }
});
