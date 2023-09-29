import { readFileSync } from 'fs';

export default function readAsBase64 (filePath) {
  return Buffer
    .from(readFileSync(filePath))
    .toString('base64');
}
