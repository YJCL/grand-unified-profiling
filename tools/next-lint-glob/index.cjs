/* eslint-disable @typescript-eslint/no-require-imports -- Dependency adapter uses CommonJS for its consumer. */
// Only @next/eslint-plugin-next's get-root-dirs consumer uses this adapter.
// Do not treat it as a general replacement for fast-glob's full API.
const path = require('node:path');
const { globSync: tinyGlobSync } = require('tinyglobby');

function globSync(pattern, options) {
  if (typeof pattern !== 'string' || !pattern) throw new TypeError('A nonempty directory pattern is required');
  if (!options || options.onlyDirectories !== true || Object.keys(options).some(key => key !== 'onlyDirectories')) {
    throw new TypeError('Unverified Next lint glob options');
  }
  const normalized = pattern.replaceAll('\\', '/');
  const root = path.parse(normalized).root;
  const matches = root
    ? tinyGlobSync(normalized.slice(root.length), { cwd: root, absolute: true, onlyDirectories: true, expandDirectories: false })
    : tinyGlobSync(normalized, { onlyDirectories: true, expandDirectories: false });
  return matches.map(match => match.length > path.parse(match).root.length ? match.replace(/\/$/u, '') : match);
}

module.exports = { globSync };
