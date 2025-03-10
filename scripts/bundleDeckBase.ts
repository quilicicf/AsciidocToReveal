#!/usr/bin/env deno

import 'npm:parcel';
import 'npm:@parcel/reporter-cli';
import 'npm:@parcel/config-default' with { type: 'json' };
import { Parcel } from 'npm:@parcel/core';

import { FileSystemPath, resolve } from '../src/third-party/file-system/api.ts';
import { DECK_BASE_FOLDER_PATH, LIB_FOLDER, REPOSITORY_ROOT_PATH } from '../src/paths.ts';

interface ParcelConfiguration {
  inputFile: FileSystemPath;
  outputFolder: FileSystemPath;
  resolveFrom: FileSystemPath;
  cacheDir: FileSystemPath;
}

async function main () {
  const INPUT_FILE_PATH = resolve(LIB_FOLDER, 'deckBase.mjs');
  const PARCEL_CACHE_FOLDER_PATH = resolve(REPOSITORY_ROOT_PATH, 'ignored', '.parcel-cache');
  const WTF_FOLDER_PATH = resolve(REPOSITORY_ROOT_PATH, '..', '..', 'Operis-Fr');
  console.log(WTF_FOLDER_PATH);
  await bundle({
    inputFile: INPUT_FILE_PATH,
    outputFolder: DECK_BASE_FOLDER_PATH,
    resolveFrom: REPOSITORY_ROOT_PATH,
    cacheDir: PARCEL_CACHE_FOLDER_PATH,
  });
}

async function bundle (config: ParcelConfiguration): Promise<void> {
  const {
    inputFile,
    outputFolder,
    resolveFrom,
    cacheDir,
  } = config;
  console.log(`Bundling ${inputFile} in ${outputFolder}`);
  await new Parcel({
    entries: [ inputFile ],
    mode: 'production',
    defaultConfig: '@parcel/config-default',
    shouldContentHash: false,
    shouldAutoInstall: false,
    defaultTargetOptions: {
      sourceMaps: false,
      distDir: outputFolder,
      engines: { browsers: [ 'last 1 Firefox version' ] },
    },
    additionalReporters: [
      { packageName: '@parcel/reporter-cli', resolveFrom },
    ],
    hmrOptions: null,
    serveOptions: false,
    logLevel: 'verbose',
    cacheDir,
  }).run();
}

main()
  .catch((error) => {
    console.error(`Failed with error: ${error}\n`);
    Deno.exit(1);
  })
  .then(() => Deno.exit(0));
