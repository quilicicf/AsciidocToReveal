import { basename, dirname, extname, join as _join, resolve as _resolve, toFileUrl } from 'jsr:@std/path';

export function getParentFolderName (path: string): string {
  return dirname(path);
}

export function getBaseName (path: string, suffix?: string): string {
  return basename(path, suffix);
}

export function getExtension (filePath: string): string {
  return extname(filePath);
}

export function join (...paths: string[]): string {
  return _join(...paths);
}

export function resolve (...paths: string[]): string {
  return _resolve(...paths);
}

export function pathToFileUrl (path: string): URL {
  return toFileUrl(path);
}
