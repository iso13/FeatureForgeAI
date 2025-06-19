import { fileURLToPath } from 'url';
import path from 'path';

export function getDirName(metaUrl: string) {
  return path.dirname(fileURLToPath(metaUrl));
}