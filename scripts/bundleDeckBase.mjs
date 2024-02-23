#!/usr/bin/env node

import { bundle } from '../src/third-party/bundler/api.mjs';
import { LIB_FOLDER, REPOSITORY_ROOT_PATH, DECK_BASE_FOLDER_PATH } from '../src/paths.mjs';
import { resolve } from '../src/third-party/path/api.mjs';


async function main () {
  const DECK_BASE_JS_FILE_PATH = resolve(LIB_FOLDER, 'deckBase.mjs');
  await bundle(DECK_BASE_JS_FILE_PATH, DECK_BASE_FOLDER_PATH, REPOSITORY_ROOT_PATH);
}

main()
  .catch((error) => {
    process.stderr.write(`Failed with error: ${error.stack}\n`);
    process.exit(1);
  });
