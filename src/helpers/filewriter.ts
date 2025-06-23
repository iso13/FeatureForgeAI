// src/utils/fileWriter.ts
import fs from 'fs-extra';
import path from 'path';

export async function writeFeatureFile(filePath: string, content: string) {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

export async function writeStepFile(filePath: string, content: string) {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}