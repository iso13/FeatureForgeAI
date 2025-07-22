// src/scripts/removePathPrefix.ts
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import globby from 'fast-glob';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_EXTENSIONS = ['.ts', '.tsx', '.js'];
const PROJECT_ROOT = path.resolve(__dirname, '../..'); // go up to project root
const FILE_GLOB = `**/*{${TARGET_EXTENSIONS.join(',')}}`;

async function cleanPathHeaders() {
  const files = await globby(FILE_GLOB, {
    cwd: PROJECT_ROOT,
    absolute: true,
    ignore: ['node_modules/**', 'dist/**', 'build/**'],
  });

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const lines = content.split('\n');

    // Remove any line that starts with "// Path:"
    const updatedLines = lines.filter(line => !line.trim().startsWith('// Path:'));

    if (updatedLines.length !== lines.length) {
      await fs.writeFile(file, updatedLines.join('\n'), 'utf8');
      console.log(`🧹 Cleaned: ${path.relative(PROJECT_ROOT, file)}`);
    }
  }

  console.log('✨ All "// Path:" headers removed.');
}

cleanPathHeaders().catch(console.error);