#!/usr/bin/env node

import { watch } from 'chokidar';
import { join } from 'path';

import { asciidocToReveal, REPOSITORY_ROOT_PATH } from '../src/asciidocToReveal.mjs';

const state = {
  queue: Promise.resolve(),
};
const chokidarOptions = {
  cwd: REPOSITORY_ROOT_PATH,
  ignoreInitial: true,

};

async function main () {
  const srcFilesGlob = join('src', '*');
  const deckFilePath = join('test', 'deck.adoc');

  watch([ srcFilesGlob, deckFilePath ], chokidarOptions)
    .on('all', () => { state.queue = state.queue.then(() => asciidocToReveal(deckFilePath)); });
}

main()
  .catch((error) => {
    process.stderr.write(`Failed with error: ${error.stack}\n`);
    process.exit(1);
  });
