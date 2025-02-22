import { fileURLToPath, pathToFileURL } from 'node:url';
import { basename, dirname, extname, join as _join, resolve as _resolve } from 'node:path';

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

export function fileUrlToPath(fileUrl) {
  return fileURLToPath(fileUrl);
}

export function pathToFileUrl(path) {
  return pathToFileURL(path);
}
