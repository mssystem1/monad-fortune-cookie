// scripts/patch-ox.js
const fs = require('fs');
const path = require('path');

// Find installed "ox" package root
let oxPkgPath;
try {
  oxPkgPath = require.resolve('ox/package.json', { paths: [process.cwd()] });
} catch (e) {
  console.log('[patch-ox] ox not installed; skipping.');
  process.exit(0);
}
const oxRoot = path.dirname(oxPkgPath);

// Candidate file locations across ox versions
const candidates = [
  'core/Signature.ts',
  'src/core/Signature.ts',
  'dist/core/Signature.js',
  'core/Signature.js',
];

let target = null;
for (const rel of candidates) {
  const p = path.join(oxRoot, rel);
  if (fs.existsSync(p)) { target = p; break; }
}

if (!target) {
  console.log('[patch-ox] could not locate Signature file in ox. Checked:', candidates);
  process.exit(0);
}

// Read file & inject ts-nocheck if not already present
let text = fs.readFileSync(target, 'utf8');
if (!/^\s*\/\/\s*@ts-nocheck/m.test(text)) {
  text = `// @ts-nocheck\n${text}`;
  fs.writeFileSync(target, text);
  console.log('[patch-ox] added // @ts-nocheck to:', target);
} else {
  console.log('[patch-ox] already patched:', target);
}

// Optional: also relax the exact narrowing line if present (defensive)
const before = /if\s*\(\s*signature\.v\s*\)\s*return\s*fromLegacy\(\s*signature\s*\)/;
if (before.test(text)) {
  const after =
    "if ('v' in (signature as any) && (signature as any).v != null) return fromLegacy(signature as any)";
  text = text.replace(before, after);
  fs.writeFileSync(target, text);
  console.log('[patch-ox] relaxed narrowing in:', target);
}
