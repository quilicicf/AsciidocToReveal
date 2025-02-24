#!/usr/bin/env deno

import 'npm:parcel';
import 'npm:@parcel/reporter-cli';
import 'npm:@parcel/config-default';
import { Parcel } from 'npm:@parcel/core';

import { resolve } from '../src/third-party/path/api.ts';
import { DECK_BASE_FOLDER_PATH, LIB_FOLDER, REPOSITORY_ROOT_PATH } from '../src/paths.ts';

async function main () {
  const INPUT_FILE_PATH = resolve(LIB_FOLDER, 'deckBase.mjs');
  await bundle(INPUT_FILE_PATH, DECK_BASE_FOLDER_PATH, REPOSITORY_ROOT_PATH);
}

async function bundle (inputFilePath: string, outputFolderPath: string, resolveFrom: string): Promise<void> {
  console.log(`Bundling ${inputFilePath} in ${outputFolderPath}`);
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
