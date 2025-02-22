import { createHash } from 'node:crypto';

export function hashString (content) {
  return createHash('md5')
    .update(content)
    .digest('hex')
    .substring(0, 12);
}
