import { watch } from 'chokidar';
import { existsSync } from 'fs';
import { stoyle } from 'stoyle';

import { asciidocToReveal } from '../src/asciidocToReveal.mjs';
import { hashFile } from '../src/contentHasher.mjs';
import { REPOSITORY_ROOT_PATH } from '../src/folders.mjs';
import { logInfo, theme } from '../src/log.mjs';
import startLiveReloadServer from './liveReloadServer.mjs';

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
  };

  const initialInputHash = hashFile(inputFile);
  const liveReloadServer = startLiveReloadServer(initialInputHash);

  logInfo(stoyle`Watcher started on ${inputFile}`({ nodes: [ theme.strong ] }));
  watch([ inputFile ], chokidarOptions)
    .on('all', (event, path) => {
      logInfo('=====================================================================');
      logInfo(stoyle`File ${path} received event ${event}`({ nodes: [ theme.strong, theme.strong ] }));
      state.queue = state.queue.then(async () => {
        const newInputHash = hashFile(inputFile);
        await asciidocToReveal(inputFile, outputFile, { shouldAddLiveReload: true });
        liveReloadServer.reload(newInputHash);
      });
    });
}
