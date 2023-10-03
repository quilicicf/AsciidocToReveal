import { existsSync } from 'fs';
import { watch } from 'chokidar';

import { asciidocToReveal } from '../src/asciidocToReveal.mjs';
import { REPOSITORY_ROOT_PATH } from '../src/folders.mjs';

export const command = 'watch';
export const aliases = [ 'w' ];
export const describe = 'Watch a file containing an asciidoc presentation and convert it to an HTML presentation';

export function builder (yargs) {
  return yargs
    .usage(`a2r ${command} [options]`)
    .option('input-file', {
      alias: 'i',
      type: 'string',
      describe: 'The path to the input file containing the asciidoc deck',
      requiresArg: true,
      demandOption: true,
      async coerce (filePath) {
        if (!existsSync(filePath)) {
          throw Error(`The input file was not found`);
        }
        return filePath;
      },
    })
    .option('output-file', {
      alias: 'o',
      type: 'string',
      describe: 'The path where the output HTML deck is written',
      requiresArg: true,
      demandOption: true,
    })
    .help()
    .wrap(null);
}

export async function handler (args) {
  const { inputFile, outputFile } = args;

  const state = {
    queue: Promise.resolve(),
  };
  const chokidarOptions = {
    cwd: REPOSITORY_ROOT_PATH,
    ignoreInitial: true,
  };

  console.log(`Watcher started on ${inputFile}`);
  watch([ inputFile ], chokidarOptions)
    .on('all', (event, path) => {
      console.log(`=====================================================================\nFile ${path} received event ${event}`);
      state.queue = state.queue.then(() => asciidocToReveal(inputFile, outputFile));
    });
}
