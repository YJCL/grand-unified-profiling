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

function load(file, mocks, env = {}, logger = console) {
  const loadedModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module: loadedModule, exports: loadedModule.exports, process: { env }, console: logger,
    Buffer, URL, btoa: (s) => Buffer.from(s).toString('base64'),
    require: (id) => {
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
  assert.equal(res.status, 403); assert.equal(writes(), 0);
});
test('even an authenticated registered owner cannot use guest registration to reset a password', async () => {
  const { route, writes } = registrationFixture({ ok: true, user: { id: 'registered-b', passwordHash: 'fixture-hash' } });
  const res = await route.POST({ json: async () => ({ email: 'fixture@example.invalid', password: 'fixture-password', userId: 'registered-b' }) });
  assert.equal(res.status, 409); assert.equal(writes(), 0);
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
test('analytics drops reset tokens, contact details, diagnosis answers and free text', () => {
  const { minimizeAnalyticsProps } = load('lib/analytics-privacy.ts', {});
  const result = minimizeAnalyticsProps({ pagePath: '/reset?token=fictional-secret', firstReferrer: 'https://example.invalid/?email=fixture@example.invalid', answer: 'fictional-private-answer', utmCampaign: 'fixture@example.invalid', source: 'settings', questions: 3 });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { pagePath: '/reset', source: 'settings', questions: 3 });
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
