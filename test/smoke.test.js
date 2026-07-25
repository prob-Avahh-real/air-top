import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const proj = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const need = [
  "AGENTS.md"
];

test('project smoke: critical files exist', () => {
  for (const rel of need) {
    assert.ok(fs.existsSync(path.join(proj, rel)), `missing ${rel}`);
  }
});

test('project has identity', () => {
  const pkg = path.join(proj, 'package.json');
  if (fs.existsSync(pkg)) {
    const data = JSON.parse(fs.readFileSync(pkg, 'utf8'));
    assert.ok(data.name, 'package.json name');
  } else {
    assert.ok(fs.existsSync(path.join(proj, 'AGENTS.md')), 'AGENTS.md');
  }
});
