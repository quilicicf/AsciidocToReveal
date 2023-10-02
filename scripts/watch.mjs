#!/usr/bin/env node

import { watch } from 'chokidar';
import { join } from 'path';

import { asciidocToReveal } from '../src/asciidocToReveal.mjs';
import { REPOSITORY_ROOT_PATH } from '../src/folders.mjs';

const state = {
  queue: Promise.resolve(),
};
const chokidarOptions = {
  cwd: REPOSITORY_ROOT_PATH,
  ignoreInitial: true,
};

async function main () {
  const srcFilesGlob = join('src', '*');
  const libFilesGlob = join('lib', '*');
  const deckFilePath = join('test', 'deck.adoc');

  watch([ srcFilesGlob, libFilesGlob, deckFilePath ], chokidarOptions)
    .on('all', (event, path) => {
      console.log(`=====================================================================\nFile ${path} received event ${event}`);
      state.queue = state.queue.then(() => asciidocToReveal(deckFilePath));
    });
}

main()
  .catch((error) => {
    process.stderr.write(`Failed with error: ${error.stack}\n`);
    process.exit(1);
  });
