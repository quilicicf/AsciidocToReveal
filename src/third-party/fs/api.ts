import { ChokidarOptions, watch as _watch } from 'npm:chokidar';
import { existsSync as _existsSync } from "jsr:@std/fs/exists";
import { ensureDirSync } from "jsr:@std/fs/ensure-dir";
import {
  mkdirSync as _mkdirSync,
  readdirSync as _readdirSync,
  statSync as _statSync,
} from 'node:fs';
import { encodeBase64 } from 'jsr:@std/encoding/base64';

type Converter<T> = (content: string) => T;

export const statSync = _statSync;
export const mkdirSync = _mkdirSync;

export function mkdirIfNotExistsSync (path: string): void {
  return ensureDirSync(path);
}

export function readdirSync (filePath: string): string[] {
  return _readdirSync(filePath);
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

export function watch (globs: string, { cwd }: { cwd: string }, listeners: EventListener[]) {
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
