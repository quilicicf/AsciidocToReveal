import { encodeBase64 } from 'https://deno.land/std@0.204.0/encoding/base64.ts';
import { existsSync as _existSync } from 'https://deno.land/std@0.92.0/fs/exists.ts';

export function readdirSync (filePath) {
  return [ ...Deno.readDirSync(filePath) ]
    .map(({ name }) => name);
}

export const existsSync = _existSync;
export const statSync = Deno.statSync;
export const mkdirSync = Deno.mkdirSync;

export function readAsBase64Sync (filePath) {
  return encodeBase64(Deno.readFileSync(filePath));
}

export function readTextFileSync (filePath, converter) {
  return typeof converter === 'function'
    ? converter(Deno.readTextFileSync(filePath))
    : Deno.readTextFileSync(filePath);
}

export function writeTextFileSync (filePath, content) {
  Deno.writeTextFileSync(filePath, content);
}
