#!/usr/bin/env deno

import 'npm:parcel';
import 'npm:@parcel/reporter-cli';
// import 'npm:@parcel/config-default';
import { resolve } from 'node:path';
import { Parcel } from 'npm:@parcel/core';

async function main () {
  const HERE = import.meta.dirname || '';
  const REPOSITORY_ROOT_PATH = resolve(HERE, '..');
  const LIB_FOLDER_PATH = resolve(REPOSITORY_ROOT_PATH, 'lib');
  const BUNDLED_FOLDER_PATH = resolve(REPOSITORY_ROOT_PATH, 'bundled');
  const DECK_BASE_JS_FILE_PATH = resolve(LIB_FOLDER_PATH, 'deckBase.mjs');

  await bundle(DECK_BASE_JS_FILE_PATH, BUNDLED_FOLDER_PATH, REPOSITORY_ROOT_PATH);
}

async function bundle (inputFilePath: string, outputFolderPath: string, resolveFrom: string): Promise<void> {
  await new Parcel({
    entries: [ inputFilePath ],
    mode: 'production',
    defaultConfig: '@parcel/config-default',
    shouldContentHash: false,
    shouldAutoInstall: false,
    defaultTargetOptions: {
      sourceMaps: false,
      distDir: outputFolderPath,
      engines: { browsers: [ 'last 1 Firefox version' ] },
    },
    additionalReporters: [
      { packageName: '@parcel/reporter-cli', resolveFrom },
    ],
  }).run();
}

main()
  .catch((error) => {
    console.error(`Failed with error: ${error}\n`);
    Deno.exit(1);
  })
  .then(() => Deno.exit(0));
