import { createHash } from 'crypto';
import { readFileSync } from 'fs';

export function hashString (content) {
  return createHash('md5')
    .update(content)
    .digest('hex')
    .substring(0, 12);
}

export function hashFile (filePath) {
  const fileContent = readFileSync(filePath, 'utf8');
  return hashString(fileContent);
}
