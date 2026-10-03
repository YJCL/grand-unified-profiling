// Exercise the real Next.js lint consumer after replacing only its fast-glob dependency.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pluginPath = require.resolve('@next/eslint-plugin-next');
const pluginRequire = createRequire(pluginPath);
const { getRootDirs } = pluginRequire('./utils/get-root-dirs.js');
const plugin = require('@next/eslint-plugin-next');
const { Linter } = require('eslint');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'orba-lint-glob-'));
for (const name of ['one', 'two']) {
  fs.mkdirSync(path.join(fixture, 'apps', name, 'pages'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'apps', name, 'pages', 'about.jsx'), 'export default function About() { return null; }');
}
fs.writeFileSync(path.join(fixture, 'apps', 'not-a-directory'), 'fixture');
const normalized = fixture.replaceAll('\\', '/');
const expected = ['one', 'two'].map(name => `${normalized}/apps/${name}`).sort();

test('Next lint resolves only its scoped fast-glob to the verified directory adapter', () => {
  assert.equal(pluginRequire('fast-glob/package.json').version, '3.3.1-orba.1');
  assert.equal(typeof pluginRequire('fast-glob').globSync, 'function');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.overrides['@next/eslint-plugin-next']['fast-glob'], '$fast-glob');
  assert.equal(pkg.devDependencies['fast-glob'], 'file:tools/next-lint-glob');
  assert.equal(pkg.overrides['fast-glob'], undefined);
});

test('custom rootDir wildcard finds directories and excludes files', () => {
  const roots = getRootDirs({ cwd: fixture, settings: { next: { rootDir: `${normalized}/apps/*` } } });
  assert.deepEqual(roots.sort(), expected);
});

test('custom rootDir supports braces, arrays and Windows separators', () => {
  assert.deepEqual(getRootDirs({ cwd: fixture, settings: { next: { rootDir: `${normalized}/apps/{one,two}` } } }).sort(), expected);
  const roots = getRootDirs({ cwd: fixture, settings: { next: { rootDir: [path.join(fixture, 'apps', 'one'), `${normalized}/apps/two`, 42] } } });
  assert.deepEqual(roots.sort(), expected);
});

test('real Next lint rule still detects a prohibited internal HTML link with a glob root', () => {
  const messages = new Linter().verify('const view = <a href="/about">About</a>;', {
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { '@next/next': plugin },
    settings: { next: { rootDir: `${normalized}/apps/*` } },
    rules: { '@next/next/no-html-link-for-pages': 'error' },
  });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].ruleId, '@next/next/no-html-link-for-pages');
  assert.equal(messages[0].severity, 2);
});

test('future Next lint updates must not add unverified fast-glob callers', () => {
  const folder = path.dirname(pluginPath);
  const callers = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.name.endsWith('.js') && /require\(["']fast-glob["']\)/u.test(fs.readFileSync(target, 'utf8'))) callers.push(path.relative(folder, target).replaceAll('\\', '/'));
    }
  }
  visit(folder);
  assert.deepEqual(callers, ['utils/get-root-dirs.js']);
  const source = fs.readFileSync(path.join(folder, callers[0]), 'utf8');
  assert.match(source, /\.globSync\)/u);
  assert.match(source, /onlyDirectories:\s*true/u);
});
