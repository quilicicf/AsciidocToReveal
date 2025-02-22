import { watch as _watch } from 'chokidar';
import { existsSync as _existsSync, mkdirSync as _mkdirSync, readdirSync as _readdirSync, readFileSync, statSync as _statSync, writeFileSync } from 'node:fs';
import { encodeBase64 } from "jsr:@std/encoding/base64";

export const statSync = _statSync;
export const mkdirSync = _mkdirSync;

export function mkdirIfNotExistsSync (path) {
  if (!existsSync(path)) {
    mkdirSync(path);
  }
}

export function readdirSync (filePath) {
  return _readdirSync(filePath);
}

export function existsSync (filePath) {
  return _existsSync(filePath);
}

export function readAsBase64Sync (filePath) {
  const arrayBuffer = Deno.readFileSync(filePath);
  return encodeBase64(arrayBuffer);
}

export function readTextFileSync (filePath, converter) {
  return typeof converter === 'function'
    ? converter(readFileSync(filePath, 'utf8'))
    : readFileSync(filePath, 'utf8');
}

export function writeTextFileSync (filePath, content) {
  writeFileSync(filePath, content, 'utf8');
}

export function watch (globs, { cwd }, listeners) {
  const watcher = _watch(globs, { cwd, disableGlobbing: false, depth: 10, ignoreInitial: true });
  Object.entries(listeners)
    .forEach(([ messageType, listener ]) => watcher.on(messageType, listener));
}
