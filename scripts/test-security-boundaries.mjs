// Privacy gate: source-code boundary tests with fictional users, no external requests or real data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import * as crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(path.join(root, 'package.json'))('typescript');

function load(file, mocks, env = {}, logger = console, globals = {}) {
  const loadedModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module: loadedModule, exports: loadedModule.exports, process: { env }, console: logger,
    Buffer, URL, btoa: (s) => Buffer.from(s).toString('base64'), ...globals,
    require: (id) => {
      if (!Object.hasOwn(mocks, id) && (id === '@/lib/service-policy' || id === './service-policy')) return load('lib/service-policy.ts', {});
      if (!Object.hasOwn(mocks, id) && id === '@/lib/engine/calculation-meta') return load('lib/engine/calculation-meta.ts', {});
      if (!Object.hasOwn(mocks, id) && id === '@/lib/engine/birth-input') return load('lib/engine/birth-input.ts', {});
      if (!Object.hasOwn(mocks, id) && id === '@/lib/engine/profile') return {};
      if (!Object.hasOwn(mocks, id)) throw new Error(`Unmocked dependency ${id}`);
      return mocks[id];
    },
  });
  return loadedModule.exports;
}

function authFixture() {
  const jar = new Map();
  const users = new Map([
    ['registered-a', { id: 'registered-a', passwordHash: 'fictional-hash' }],
    ['registered-b', { id: 'registered-b', passwordHash: 'fictional-hash' }],
    ['guest-b', { id: 'guest-b', passwordHash: null }],
  ]);
  const auth = load('lib/auth.ts', {
    crypto,
    'next/headers': { cookies: async () => ({ get: (key) => jar.has(key) ? { value: jar.get(key) } : undefined }) },
    '@/lib/prisma': { prisma: { user: { findUnique: async ({ where }) => users.get(where.id) || null } } },
  }, { AUTH_SECRET: 'fictional-test-secret' });
  return { auth, setCookie: (token) => jar.set(auth.SESSION_COOKIE, token), setGuest: (id, token) => jar.set(auth.guestCookieName(id), token) };
}

test('registered user can access own data with a signed session', async () => {
  const { auth, setCookie } = authFixture();
  setCookie(auth.createSessionToken('registered-a'));
  assert.equal((await auth.checkUserAccess('registered-a')).ok, true);
});
test('registered user cannot access another registered user', async () => {
  const { auth, setCookie } = authFixture();
  setCookie(auth.createSessionToken('registered-a'));
  const result = await auth.checkUserAccess('registered-b');
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});
test('registered data denies a missing or forged session', async () => {
  const { auth, setCookie } = authFixture();
  assert.equal((await auth.checkUserAccess('registered-b')).ok, false);
  setCookie(Buffer.from('registered-b:invalid-signature').toString('base64url'));
  assert.equal((await auth.checkUserAccess('registered-b')).ok, false);
});
test('PRIVACY GATE: guest data must deny requests with no owner session', async () => {
  const { auth } = authFixture();
  assert.equal((await auth.checkUserAccess('guest-b')).ok, false, 'Existing implementation grants access by ID alone. Block rollout pending owner-session enforcement.');
});
test('PRIVACY GATE: a registered user must not access another guest by ID', async () => {
  const { auth, setCookie } = authFixture();
  setCookie(auth.createSessionToken('registered-a'));
  assert.equal((await auth.checkUserAccess('guest-b')).ok, false, 'Existing implementation skips session checks for guests.');
});

test('a valid legacy main session still owns its guest', async () => {
  const { auth, setCookie } = authFixture();
  setCookie(auth.createSessionToken('guest-b'));
  assert.equal((await auth.checkUserAccess('guest-b')).ok, true);
});
test('an additional signed guest profile preserves the main account session', async () => {
  const { auth, setCookie, setGuest } = authFixture();
  setCookie(auth.createSessionToken('registered-a'));
  setGuest('guest-b', auth.createSessionToken('guest-b'));
  assert.equal((await auth.checkUserAccess('guest-b')).ok, true);
  assert.equal(await auth.getSessionUserId(), 'registered-a');
});
test('a guest cookie cannot authenticate a registered account', async () => {
  const { auth, setGuest } = authFixture();
  setGuest('registered-b', auth.createSessionToken('registered-b'));
  assert.equal((await auth.checkUserAccess('registered-b')).ok, false);
});
test('production authentication fails closed without a secret', () => {
  const auth = load('lib/auth.ts', { crypto, 'next/headers': {}, '@/lib/prisma': {} }, { NODE_ENV: 'production' });
  assert.throws(() => auth.createSessionToken('guest-b'));
  assert.equal(auth.verifySessionToken('forged'), null);
});

function responseMock() {
  return { json(body, init = {}) { return { body, status: init.status || 200, cookies: { set() {} } }; } };
}
function registrationFixture(access) {
  let writes = 0;
  const route = load('app/api/auth/register/route.ts', {
    'next/server': { NextResponse: responseMock() },
    '@/lib/prisma': { prisma: { user: { findUnique: async () => null, update: async () => { writes++; throw new Error('Unexpected write'); }, create: async () => { writes++; throw new Error('Unexpected write'); } } } },
    '@/lib/auth': { checkUserAccess: async () => access, hashPassword: () => 'fixture-hash' },
  });
  return { route, writes: () => writes };
}
test('registration cannot overwrite credentials using an existing ID without owner proof', async () => {
  const { route, writes } = registrationFixture({ ok: false, status: 403, error: 'Denied' });
  const res = await route.POST({ json: async () => ({ email: 'fixture@example.invalid', password: 'fixture-password', userId: 'registered-b' }) });
  assert.equal(res.status, 410); assert.equal(writes(), 0);
});
test('even an authenticated registered owner cannot use guest registration to reset a password', async () => {
  const { route, writes } = registrationFixture({ ok: true, user: { id: 'registered-b', passwordHash: 'fixture-hash' } });
  const res = await route.POST({ json: async () => ({ email: 'fixture@example.invalid', password: 'fixture-password', userId: 'registered-b' }) });
  assert.equal(res.status, 410); assert.equal(writes(), 0);
});
test('user API returns an explicit DTO without private memory or credentials', async () => {
  const user = { id: 'guest-b', passwordHash: 'private-hash', memory: 'private-memory', komojuCustomerId: 'private-billing', diagnoses: [] };
  const route = load('app/api/user/route.ts', {
    'next/server': { NextResponse: responseMock() },
    '@/lib/auth': { checkUserAccess: async () => ({ ok: true, user }) },
    '@/lib/prisma': { prisma: { user: { findUnique: async () => user } } },
  });
  const res = await route.GET({ url: 'https://example.invalid/api/user?id=guest-b' });
  assert.equal(res.status, 200);
  assert.doesNotMatch(JSON.stringify(res.body), /private-|passwordHash|memory|komojuCustomerId/);
});
test('legacy short transfer codes are rejected before database access', async () => {
  const route = load('app/api/transfer/route.ts', { crypto, 'next/server': { NextResponse: responseMock() }, '@/lib/auth': {}, '@/lib/prisma': { prisma: {} } });
  assert.equal((await route.GET({ url: 'https://example.invalid/api/transfer?code=ABC123' })).status, 410);
});

for (const [file, method] of [['auth/register','POST'],['billing/upgrade','POST'],['billing/complete','GET'],['chat','POST'],['chat','DELETE']]) {
  test(`closed ${file} ${method} does no body read, database work or provider calls even with billing env enabled`, async () => {
    const route = load(`app/api/${file}/route.ts`, { 'next/server': { NextResponse: responseMock() }, '@/lib/prisma': { prisma: {} }, '@/lib/auth': {} }, { NEXT_PUBLIC_BILLING_ENABLED: 'true', ANTHROPIC_API_KEY: 'fictional-only' });
    const result = await route[method]({ json() { throw new Error('Body must not be read'); }, url: 'https://example.invalid/?session_id=fictional-session' });
    assert.equal(result.status, 410);
  });
}
test('anonymous creation is closed while signed existing profile updates remain available', async () => {
  let authorizations = 0, writes = 0;
  const user = { id: 'fictional-existing', name: 'Before' };
  const route = load('app/api/user/route.ts', {
    'next/server': { NextResponse: responseMock() },
    '@/lib/auth': { checkUserAccess: async id => { authorizations++; return { ok: true, user: { ...user, id } }; } },
    '@/lib/prisma': { prisma: { user: { update: async ({ where, data }) => { writes++; assert.equal(where.id, user.id); return { ...user, ...data }; } } } },
  });
  assert.equal((await route.POST({ json: async () => ({ name: 'fictional-new' }) })).status, 410);
  assert.equal(authorizations, 0); assert.equal(writes, 0);
  const updated = await route.POST({ json: async () => ({ id: user.id, name: 'After', isPremium: true }) });
  assert.equal(updated.status, 200); assert.equal(updated.body.name, 'After'); assert.equal(updated.body.isPremium, undefined);
  assert.equal(authorizations, 1); assert.equal(writes, 1);
});
test('ID-only update remains forbidden and does not write', async () => {
  const route = load('app/api/user/route.ts', { 'next/server': { NextResponse: responseMock() }, '@/lib/auth': { checkUserAccess: async () => ({ ok: false, status: 403, error: 'Denied' }) }, '@/lib/prisma': { prisma: {} } });
  assert.equal((await route.POST({ json: async () => ({ id: 'fictional-existing', name: 'Overwrite' }) })).status, 403);
});
test('ambiguous birth input is rejected before changing an existing profile', async () => {
  const input = load('lib/engine/birth-input.ts', {});
  const route = load('app/api/user/route.ts', {
    'next/server': { NextResponse: responseMock() }, '@/lib/prisma': { prisma: {} },
    '@/lib/auth': { checkUserAccess: async () => ({ ok: true, user: { id: 'fictional-owner', birthDate: '2000-01-01' } }) },
    '@/lib/engine/birth-input': input,
    '@/lib/engine/profile': { buildProfileFromUser: () => { throw new input.BirthInputError('ambiguous_local_time'); } },
  });
  const result = await route.POST({ json: async () => ({ id: 'fictional-owner', birthTime: '01:30' }) });
  assert.equal(result.status, 422); assert.equal(result.body.code, 'ambiguous_local_time'); assert.match(result.body.error, /未入力/);
});
test('chat history remains unchanged and accessible only after owner authorization', async () => {
  const messages = [{ role: 'user', content: 'fictional-history' }, { role: 'assistant', content: 'fictional-saved-answer' }];
  let reads = 0, allowed = false;
  const route = load('app/api/chat/route.ts', {
    'next/server': { NextResponse: responseMock() },
    '@/lib/auth': { checkUserAccess: async () => allowed ? { ok: true, user: { id: 'fictional-existing' } } : { ok: false, status: 403, error: 'Denied' } },
    '@/lib/prisma': { prisma: { chatLog: { findFirst: async () => { reads++; return { messages: JSON.stringify(messages) }; } } } },
  });
  const request = { url: 'https://example.invalid/api/chat?userId=fictional-existing' };
  assert.equal((await route.GET(request)).status, 403); assert.equal(reads, 0);
  allowed = true;
  const saved = await route.GET(request);
  assert.deepEqual(JSON.parse(JSON.stringify(saved.body.messages)), messages); assert.equal(saved.body.readOnly, true); assert.equal(reads, 1);
  assert.equal((await route.DELETE(request)).status, 410); assert.equal(reads, 1);
});
test('old sharing tokens cannot acquire account ownership after reception closure', async () => {
  const route = load('app/api/transfer/route.ts', { crypto, 'next/server': { NextResponse: responseMock() }, '@/lib/auth': {}, '@/lib/prisma': { prisma: {} } });
  const response = await route.POST({ json: async () => ({ code: 'A'.repeat(32) }) });
  assert.equal(response.status, 410);
});
test('fresh guest recovery restores the existing identity once without creating an account', async () => {
  const code = 'R1-' + 'A'.repeat(32), cookies = [];
  let consumed = false;
  const tx = {
    transferCode: { findUnique: async () => consumed ? null : { userId: 'fictional-guest', expiresAt: new Date(Date.now() + 60_000) }, deleteMany: async () => { consumed = true; return { count: 1 }; } },
    user: { findUnique: async () => ({ id: 'fictional-guest', passwordHash: null, profileType: 'self' }) },
  };
  const route = load('app/api/transfer/route.ts', {
    crypto, 'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status || 200, cookies: { set: (...args) => cookies.push(args) } }) } },
    '@/lib/prisma': { prisma: { $transaction: async callback => callback(tx) } },
    '@/lib/auth': { createSessionToken: id => 'fixture-signed:' + id, guestCookieName: id => 'guest:' + id, sessionCookieOptions: {}, SESSION_COOKIE: 'session', getSessionUserId: async () => 'fictional-main' },
  }, {}, console, { Date });
  const request = { json: async () => ({ code }) };
  const restored = await route.POST(request);
  assert.equal(restored.body.id, 'fictional-guest'); assert.equal(restored.status, 200);
  assert.equal(cookies.length, 1); assert.equal(cookies[0][0], 'guest:fictional-guest');
  assert.equal((await route.POST(request)).status, 410);
});
test('new purchase library calls fail before fetch while existing cancellation still reaches its API', async () => {
  const calls = [];
  const lib = load('lib/komoju.ts', { crypto }, { KOMOJU_SECRET_KEY: 'fictional-test' }, console, { Headers, fetch: async (url, init) => { calls.push({ url, method: init.method }); return { ok: true, json: async () => ({ id: 'fictional-existing-sub' }) }; } });
  await assert.rejects(lib.createCustomerSession({ userId: 'fixture', email: 'fixture@example.invalid', returnUrl: 'https://example.invalid' }));
  assert.throws(() => lib.createSubscription({ customerId: 'fixture', userId: 'fixture', checkoutSessionId: 'fixture' }));
  assert.equal(calls.length, 0);
  await lib.deleteSubscription('fictional-existing-sub');
  assert.equal(calls.length, 1); assert.equal(calls[0].method, 'DELETE');
});
test('existing account login still issues its signed session with no new-account write', async () => {
  const route = load('app/api/auth/login/route.ts', {
    'next/server': { NextResponse: responseMock() },
    '@/lib/prisma': { prisma: { user: { findUnique: async () => ({ id: 'fictional-owner', email: 'fixture@example.invalid', passwordHash: 'fixture-hash', isPremium: true, failedLogins: 0 }) } } },
    '@/lib/auth': { verifyPassword: () => true, createSessionToken: () => 'fictional-signed-session', sessionCookieOptions: {}, SESSION_COOKIE: 'session' },
  });
  const result = await route.POST({ json: async () => ({ email: 'fixture@example.invalid', password: 'fictional-password' }) });
  assert.equal(result.status, 200); assert.equal(result.body.id, 'fictional-owner');
});

test('a new diagnosis appends a separate result and preserves previous results and frozen symbols', async () => {
  const old = { id: 'fictional-old', data: JSON.stringify({ coreNature: 'fictional-old-interpretation', signature: { lead: 'fictional-frozen' } }) };
  const rows = [old], original = JSON.stringify(old);
  const route = load('app/api/diagnosis/route.ts', {
    'next/server': { NextResponse: responseMock() }, '@/lib/auth': { checkUserAccess: async () => ({ ok: true, user: { id: 'fictional-owner' } }) },
    '@/lib/prisma': { prisma: {
      user: { findUnique: async () => ({ frozenSignature: JSON.stringify({ lead: 'fictional-frozen' }), frozenCompass: null }), update: async () => { throw new Error('Existing frozen data must not be updated'); } },
      diagnosis: { create: async ({ data }) => { const row = { id: 'fictional-new', ...data }; rows.push(row); return row; } },
    } },
  });
  const saved = await route.POST({ json: async () => ({ userId: 'fictional-owner', data: { coreNature: 'fictional-new-reading', signature: { lead: 'new' }, calculation: { version: '2026-10-03-v2', retainedSymbols: true } } }) });
  assert.equal(saved.status, 200); assert.equal(rows.length, 2); assert.equal(JSON.stringify(old), original);
  const newest = JSON.parse(rows[1].data); assert.equal(newest.signature.lead, 'fictional-frozen'); assert.equal(newest.calculation.version, '2026-10-03-v2');
});
test('cached legacy daily content is returned verbatim without model use, recalculation or write', async () => {
  const old = { theme: 'fictional-old-theme', guidance: 'fictional-old-guidance', timing: 'old', action: 'old', affirmation: 'old' };
  const route = load('app/api/daily/route.ts', {
    'next/server': { NextResponse: responseMock() }, '@anthropic-ai/sdk': class {},
    '@/lib/prisma': { prisma: { user: { findUnique: async () => ({ birthDate: '2000-01-01', dailyLogs: [{ data: JSON.stringify(old) }] }) } } },
    '@/lib/auth': { checkUserAccess: async () => ({ ok: true }) }, '@/lib/jst': { jstDateKey: () => '2026-10-03' },
    '@/lib/engine/profile': { buildProfileFromUser: () => { throw new Error('Old cache must not recalculate'); } },
    '@/lib/engine/daily': {}, '@/lib/engine/summarize': {}, '@/lib/character': {}, '@/lib/ai-safety': {}, '@/lib/ai-safety-log': {},
  });
  const result = await route.GET({ url: 'https://example.invalid/api/daily?userId=fictional-owner' });
  assert.equal(result.status, 200); assert.deepEqual(JSON.parse(JSON.stringify(result.body)), old);
});
test('DST errors provide fixed actionable guidance without echoing private data', () => {
  const { birthInputIssue } = load('lib/engine/birth-input.ts', {});
  assert.match(birthInputIssue('ambiguous_local_time').error, /UTCオフセット/);
  assert.match(birthInputIssue('nonexistent_local_time').error, /存在しません/);
  assert.doesNotMatch(JSON.stringify(birthInputIssue('fictional-private-input')), /fictional-private/);
});
test('analytics drops reset tokens, contact details, diagnosis answers and free text', () => {
  const { minimizeAnalyticsProps } = load('lib/analytics-privacy.ts', {});
  const result = minimizeAnalyticsProps({ pagePath: '/reset?token=fictional-secret', firstReferrer: 'https://example.invalid/?email=fixture@example.invalid', answer: 'fictional-private-answer', utmCampaign: 'fixture@example.invalid', source: 'settings', questions: 3 });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { pagePath: '/reset', source: 'settings', questions: 3 });
});

test('profile calculation failure never returns or logs private inputs or provider exceptions', async () => {
  const emitted = [];
  const route = load('app/api/divine/route.ts', {
    '@anthropic-ai/sdk': class { constructor() { this.messages = {}; } },
    'next/server': { NextResponse: responseMock() },
    '@/data/questions': { QUESTIONS: [] },
    '@/lib/engine/profile': { buildGrandProfile: () => { throw new Error('fictional-sensitive-provider-detail'); } },
    '@/lib/engine/birth-input': load('lib/engine/birth-input.ts', {}),
    '@/lib/engine/summarize': {}, '@/lib/character': {}, '@/lib/prisma': { prisma: { user: { findUnique: async () => null } } }, '@/lib/auth': { checkUserAccess: async () => ({ ok: true, user: { id: 'fictional-owner' } }) },
    '@/lib/ai-safety': { evaluateAiSafetyInput: () => ({ action: 'allow', sanitizedText: '' }) },
    '@/lib/ai-safety-log': {},
  }, { ANTHROPIC_API_KEY: 'fixture-only' }, { error: (...args) => emitted.push(args.map(String).join(' ')) });
  const res = await route.POST({ json: async () => ({ userId: 'fictional-owner', userProfile: { birthDate: 'fictional-birth-date', birthPlace: 'fictional-private-place' } }) });
  assert.equal(res.status, 500);
  assert.equal(Object.hasOwn(res.body, 'detail'), false);
  assert.doesNotMatch(JSON.stringify(res.body) + emitted.join('\n'), /fictional-sensitive|fictional-birth|fictional-private/);
});

test('invalid birth data stops profile generation before a paid model call', async () => {
  const { BirthInputError } = load('lib/engine/birth-input.ts', {});
  let modelCalls = 0;
  const route = load('app/api/divine/route.ts', {
    '@anthropic-ai/sdk': class { messages = { create: async () => { modelCalls++; throw new Error('Must not call model'); } }; },
    'next/server': { NextResponse: responseMock() }, '@/data/questions': { QUESTIONS: [] },
    '@/lib/engine/profile': { buildGrandProfile: () => { throw new BirthInputError('invalid_date'); } },
    '@/lib/engine/birth-input': { BirthInputError, birthInputIssue: load('lib/engine/birth-input.ts', {}).birthInputIssue },
    '@/lib/engine/summarize': {}, '@/lib/character': {}, '@/lib/prisma': { prisma: { user: { findUnique: async () => null } } }, '@/lib/auth': { checkUserAccess: async () => ({ ok: true, user: { id: 'fictional-owner' } }) },
    '@/lib/ai-safety': { evaluateAiSafetyInput: () => ({ action: 'allow', sanitizedText: '' }) }, '@/lib/ai-safety-log': {},
  }, { ANTHROPIC_API_KEY: 'fixture-only' });
  const res = await route.POST({ json: async () => ({ userId: 'fictional-owner', userProfile: { birthDate: '2024-02-31' } }) });
  assert.equal(res.status, 422);
  assert.equal(res.body.code, 'invalid_date');
  assert.equal(modelCalls, 0);
  assert.doesNotMatch(JSON.stringify(res.body), /2024-02-31/);
});

test('email delivery errors do not log recipient, reset URL or provider response body', async () => {
  const emitted = [];
  const logger = { warn: (...args) => emitted.push(args.join(' ')), error: (...args) => emitted.push(args.join(' ')) };
  const message = { to: 'fictional-private@example.invalid', subject: 'fictional-private-subject', html: 'fictional-reset-secret' };
  const skipped = load('lib/email.ts', {}, {}, logger);
  assert.equal((await skipped.sendEmail(message)).skipped, true);
  const failure = load('lib/email.ts', {}, { RESEND_API_KEY: 'fixture-only' }, logger, { fetch: async () => ({ ok: false, status: 400, text: async () => 'fictional-private-provider-response' }) });
  assert.equal((await failure.sendEmail(message)).ok, false);
  const thrown = load('lib/email.ts', {}, { RESEND_API_KEY: 'fixture-only' }, logger, { fetch: async () => { throw new Error('fictional-private-exception'); } });
  assert.equal((await thrown.sendEmail(message)).ok, false);
  assert.doesNotMatch(emitted.join('\n'), /fictional-private|fictional-reset/);
});

test('AI routes do not expose raw exception detail in public responses', () => {
  for (const route of ['divine', 'iching']) {
    const source = fs.readFileSync(path.join(root, `app/api/${route}/route.ts`), 'utf8');
    assert.doesNotMatch(source, /detail:\s*error|console\.error\([^\n]*,\s*error/u);
  }
});

function adminFixture(env) {
  class ResponseMock { constructor(body, init) { this.status = init.status; this.body = body; } static next() { return { status: 200 }; } }
  const targetModule = load('proxy.ts', { 'next/server': { NextResponse: ResponseMock } }, env);
  return (value) => targetModule.proxy({ headers: { get: () => value } });
}
test('admin fails closed when credentials are not configured', () => assert.equal(adminFixture({})(null).status, 503));
test('admin rejects missing and incorrect Basic credentials', () => {
  const check = adminFixture({ ADMIN_BASIC_USER: 'fixture-admin', ADMIN_BASIC_PASSWORD: 'fixture-password' });
  assert.equal(check(null).status, 401);
  assert.equal(check('Basic invalid').status, 401);
});
test('admin permits explicitly matching Basic credentials', () => {
  const check = adminFixture({ ADMIN_BASIC_USER: 'fixture-admin', ADMIN_BASIC_PASSWORD: 'fixture-password' });
  assert.equal(check(`Basic ${Buffer.from('fixture-admin:fixture-password').toString('base64')}`).status, 200);
});
test('admin matcher covers management pages and APIs', () => {
  const targetModule = load('proxy.ts', { 'next/server': {} });
  assert.deepEqual(JSON.parse(JSON.stringify(targetModule.config.matcher)), ['/admin/:path*', '/api/admin/:path*']);
});
test('safety log schema excludes consultation text and generated text', async () => {
  let recorded;
  const log = load('lib/ai-safety-log.ts', {
    '@/lib/prisma': { prisma: { event: { create: async (input) => { recorded = input.data; } } } },
    '@/lib/ai-safety': { AI_SAFETY_POLICY_VERSION: '2026-10-03' },
  });
  await log.recordAiSafetyEvent({ route: 'chat', phase: 'input', action: 'blocked', userId: 'fictional-user', categories: ['crisis'], ruleIds: ['input.crisis-intent'], rawText: 'sample@example.com', generatedText: 'fictional text' });
  assert.deepEqual(Object.keys(JSON.parse(recorded.props)).sort(), ['route', 'phase', 'action', 'categories', 'ruleIds', 'policyVersion'].sort());
  assert.doesNotMatch(JSON.stringify(recorded), /sample@|fictional text/);
});
test('PRIVACY GATE: safety-log failures must not emit raw exception contents', async () => {
  const emitted = [];
  const log = load('lib/ai-safety-log.ts', {
    '@/lib/prisma': { prisma: { event: { create: async () => { throw new Error('fictional-sensitive-detail'); } } } },
    '@/lib/ai-safety': { AI_SAFETY_POLICY_VERSION: '2026-10-03' },
  }, {}, { error: (...args) => emitted.push(args.map(String).join(' ')) });
  await log.recordAiSafetyEvent({ route: 'chat', phase: 'input', action: 'blocked', ruleIds: ['input.crisis-intent'] });
  assert.doesNotMatch(emitted.join('\n'), /fictional-sensitive-detail/);
});
