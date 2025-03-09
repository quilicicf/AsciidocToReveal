import { ChokidarOptions, watch as _watch } from 'npm:chokidar';
import { existsSync as _existsSync } from '@std/fs/exists';
import { walk } from '@std/fs/walk';
import { ensureDirSync } from '@std/fs/ensure-dir';
import { encodeBase64 } from '@std/encoding/base64';
import { basename, dirname, extname, join as _join, resolve as _resolve, toFileUrl } from '@std/path';

export type FileSystemPath = string & { __brand: 'FilePath' };

export function getCwd (): FileSystemPath {
  return Deno.cwd() as FileSystemPath;
}

export function getParentFolderName (path: FileSystemPath): FileSystemPath {
  return dirname(path) as FileSystemPath;
}

export function getBaseName (path: FileSystemPath, suffix?: string): string {
  return basename(path, suffix);
}

export function getExtension (filePath: string): string {
  return extname(filePath);
}

export function join (path: FileSystemPath, ...segments: string[]): FileSystemPath {
  return _join(path, ...segments) as FileSystemPath;
}

export function resolve (path: FileSystemPath, ...segments: string[]): FileSystemPath {
  return _resolve(path, ...segments) as FileSystemPath;
}

export function pathToFileUrl (path: FileSystemPath): URL {
  return toFileUrl(path);
}

type Converter<T> = (content: string) => T;

interface Stats {
  isFile: boolean;
  isDirectory: boolean;
}

export function statSync (filePath: FileSystemPath): Stats {
  const { isFile, isDirectory } = Deno.statSync(filePath);
  return { isFile, isDirectory };
}

export function mkdirSync (filePath: FileSystemPath, { recursive }: { recursive?: boolean }) {
  return Deno.mkdirSync(filePath, { recursive });
}

export function mkdirIfNotExistsSync (path: FileSystemPath): void {
  return ensureDirSync(path);
}


export async function readDirRecursive (filePath: FileSystemPath): Promise<FileSystemPath[]> {
  const contents: FileSystemPath[] = [];
  for await (const entry of walk(filePath)) {
    if (entry.isFile) {
      contents.push(entry.path as FileSystemPath);
    }
  }
  return contents;
}

export function readDirSync (filePath: FileSystemPath): FileSystemPath[] {
  return [ ...Deno.readDirSync(filePath) ]
    .map(({ name }) => name as FileSystemPath);
}

export function existsSync (filePath: FileSystemPath): boolean {
  return _existsSync(filePath);
}

export function readAsBufferSync (filePath: FileSystemPath): Uint8Array {
  return Deno.readFileSync(filePath);
}

export function readAsBase64Sync (filePath: FileSystemPath): string {
  const arrayBuffer = Deno.readFileSync(filePath);
  return encodeBase64(arrayBuffer);
}

export function readTextFileSync (filePath: FileSystemPath): string {
  return Deno.readTextFileSync(filePath);
}

export function readTextFileSyncAndConvert<T> (filePath: FileSystemPath, converter: Converter<T>): T {
  return converter(Deno.readTextFileSync(filePath));
}

export function writeTextFileSync (filePath: FileSystemPath, content: string): void {
  Deno.writeTextFileSync(filePath, content);
}

export type Listener = (event: string, path: FileSystemPath) => void;

export function watch (globs: string[], { cwd }: { cwd: string }, listeners: Record<string, Listener>) {
  const options: ChokidarOptions = {
    cwd,
    depth: 10,
    ignoreInitial: true,

    // @ts-ignore : check this
    disableGlobbing: false,
  };
  const watcher = _watch(globs, options);
  Object.entries(listeners)
    .forEach(([ messageType, listener ]) => {
      // @ts-ignore Ignore listener type, weird types in Chokidar
      watcher.on(messageType, listener);
    });
}
