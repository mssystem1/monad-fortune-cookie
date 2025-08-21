// scripts/patch-ox.js
const fs = require('fs');
const path = require('path');

// Resolve the installed "ox" directory via its package.json (works with exports map)
let oxPkg;
try {
  oxPkg = require.resolve('ox/package.json', { paths: [process.cwd()] });
} catch (e) {
  console.error('Cannot resolve ox/package.json. Is "ox" installed?', e.message);
  process.exit(1);
}
const oxRoot = path.dirname(oxPkg);

// Candidate locations (some versions publish TS, others JS or dist/)
const candidates = [
  'core/Signature.ts',
  'core/Signature.js',
  'src/core/Signature.ts',
  'dist/core/Signature.js',
];

let target = null;
for (const rel of candidates) {
  const p = path.join(oxRoot, rel);
  if (fs.existsSync(p)) { target = p; break; }
}

if (!target) {
  console.error('Could not locate ox Signature file. Checked:', candidates);
  process.exit(1);
}

let s = fs.readFileSync(target, 'utf8');
const before = /if\s*\(\s*signature\.v\s*\)\s*return\s*fromLegacy\(\s*signature\s*\)/;

// Only patch if it matches the old line
if (!before.test(s)) {
  console.log('Already patched or pattern not found:', target);
  process.exit(0);
}

// Safer check so TS 5.6+ union narrowing doesn’t explode in CI
const after =
  "if ('v' in (signature as any) && (signature as any).v != null) return fromLegacy(signature as any)";

s = s.replace(before, after);
fs.writeFileSync(target, s);
console.log('patched:', target);
