import { ChokidarOptions, watch as _watch } from 'npm:chokidar';
import { existsSync as _existsSync } from '@std/fs/exists';
import { ensureDirSync } from '@std/fs/ensure-dir';
import { encodeBase64 } from '@std/encoding/base64';

type Converter<T> = (content: string) => T;

interface Stats {
  isFile: boolean;
  isDirectory: boolean;
}

export function statSync (filePath: string): Stats {
  const { isFile, isDirectory } = Deno.statSync(filePath);
  return { isFile, isDirectory };
}

export function mkdirSync (filePath: string, { recursive }: { recursive?: boolean }) {
  return Deno.mkdirSync(filePath, { recursive });
}

export function mkdirIfNotExistsSync (path: string): void {
  return ensureDirSync(path);
}

export function readDirSync (filePath: string): string[] {
  return [ ...Deno.readDirSync(filePath) ]
    .map(({ name }) => name);
}

export function existsSync (filePath: string): boolean {
  return _existsSync(filePath);
}

export function readAsBase64Sync (filePath: string): string {
  const arrayBuffer = Deno.readFileSync(filePath);
  return encodeBase64(arrayBuffer);
}

export function readTextFileSync (filePath: string): string {
  return Deno.readTextFileSync(filePath);
}

export function readTextFileSyncAndConvert<T> (filePath: string, converter: Converter<T>): T {
  return converter(Deno.readTextFileSync(filePath));
}

export function writeTextFileSync (filePath: string, content: string): void {
  Deno.writeTextFileSync(filePath, content);
}

export type Listener = (event: string, path: string) => void;

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
