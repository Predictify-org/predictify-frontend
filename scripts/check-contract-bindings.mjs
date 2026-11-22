import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import core from './contract-bindings-core.cjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specPath = path.join(root, 'contracts', 'predictify-hybrid', 'spec.json');
const outputDirectory = path.join(root, 'lib', 'contracts');
const expectedFiles = ['predictify-hybrid.client.ts', 'predictify-hybrid.types.ts'];

async function main() {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'predictify-bindings-'));
  try {
    const spec = JSON.parse(await readFile(specPath, 'utf8'));
    const bindings = core.generateBindings(spec);
    for (const [fileName, contents] of Object.entries(bindings)) {
      await writeFile(path.join(tempDirectory, fileName), contents, 'utf8');
    }

    const actualFiles = await readdir(outputDirectory).catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    const drift = [];
    for (const fileName of expectedFiles) {
      const expected = await readFile(path.join(tempDirectory, fileName), 'utf8');
      let actual;
      try {
        actual = await readFile(path.join(outputDirectory, fileName), 'utf8');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (actual !== expected) drift.push(fileName);
    }
    for (const fileName of actualFiles) {
      if (!expectedFiles.includes(fileName)) drift.push(fileName);
    }

    if (drift.length > 0) {
      console.error(`Contract bindings are out of date: ${[...new Set(drift)].sort().join(', ')}`);
      console.error('Run `pnpm contracts:generate` and commit the regenerated files.');
      process.exitCode = 1;
      return;
    }
    console.log('Contract bindings are up to date.');
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Contract binding check failed: ${error.message}`);
  process.exitCode = 1;
});
