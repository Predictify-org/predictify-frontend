import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import core from './contract-bindings-core.cjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specPath = path.join(root, 'contracts', 'predictify-hybrid', 'spec.json');
const outputDirectory = path.join(root, 'lib', 'contracts');

async function main() {
  const spec = JSON.parse(await readFile(specPath, 'utf8'));
  const bindings = core.generateBindings(spec);
  await mkdir(outputDirectory, { recursive: true });
  for (const [fileName, contents] of Object.entries(bindings)) {
    await writeFile(path.join(outputDirectory, fileName), contents, 'utf8');
  }
}

main().catch((error) => {
  console.error(`Contract binding generation failed: ${error.message}`);
  process.exitCode = 1;
});
