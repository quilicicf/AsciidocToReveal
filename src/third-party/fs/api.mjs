import { watch as _watch } from 'chokidar';
import { existsSync as _existsSync, mkdirSync as _mkdirSync, readdirSync as _readdirSync, readFileSync, statSync as _statSync, writeFileSync } from 'fs';

export const statSync = _statSync;
export const mkdirSync = _mkdirSync;

export function readdirSync (filePath) {
  return _readdirSync(filePath);
}

export function existsSync (filePath) {
  return _existsSync(filePath);
}

export function readAsBase64Sync (filePath) {
  return Buffer
    .from(readFileSync(filePath))
    .toString('base64');
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
  const watcher = _watch(globs, { cwd, disableGlobbing: false, depth: 10 });
  Object.entries(listeners)
    .forEach(([ messageType, listener ]) => watcher.on(messageType, listener));
}
