import { basename, dirname, extname, isAbsolute as _isAbsolute, join as _join, resolve as _resolve } from 'https://deno.land/std@0.204.0/path/mod.ts';
import { fileURLToPath } from 'node:url';

export const isAbsolute = _isAbsolute;

export function getParentFolderName (path) {
  return dirname(path);
}

export function getBaseName (path, suffix) {
  return basename(path, suffix);
}

export function getExtension (filePath) {
  return extname(filePath);
}

export function join (...paths) {
  return _join(...paths);
}

export function resolve (...paths) {
  return _resolve(...paths);
}

export function fileUrlToPath (fileUrl) {
  return fileURLToPath(fileUrl);
}
