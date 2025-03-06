import { stoyle } from 'stoyle';
import { Arguments } from 'yargs/deno-types.ts';
import { YargsInstance } from 'yargs/build/lib/yargs-factory.js';

import { existsSync, mkdirSync, watch } from '../src/third-party/fs/api.ts';
import { logInfo, theme } from '../src/third-party/logger/log.ts';
import { getBaseName, resolve, join } from '../src/third-party/path/api.ts';
import startLiveReloadServer from './liveReloadServer.ts';

export const command = 'watch';

function builder (yargs: YargsInstance) {
  return yargs
    .usage(`a2r ${command} [options]`)
    .option('input-file', {
      alias: 'i',
      type: 'string',
      describe: 'The path to the input file containing the asciidoc deck',
      requiresArg: true,
      demandOption: true,
      coerce (filePath: string) {
        if (!existsSync(filePath)) {
          throw Error(`The input file was not found`);
        }
        return resolve(filePath);
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

async function handler (args: Arguments) {
  const { inputFile, outputFile } = args;

  const outputFolder = getBaseName(outputFile);
  mkdirSync(outputFolder, { recursive: true });

  const state = {
    queue: Promise.resolve(),
  };

  const { asciidocToReveal } = await import ('../src/asciidocToReveal.ts'); // Delay pulling all the dependencies because it's super heavy
  const {
    inputHash: initialInputHash,
    configuration: {
      assetsPath,
    },
  } = await asciidocToReveal(inputFile, outputFile, { shouldAddLiveReload: true });

  logInfo(stoyle`Watcher started on ${inputFile}`({ nodes: [ theme.strong ] }));
  logInfo(stoyle`Also watching ${assetsPath}`({ nodes: [ theme.strong ] }));

  const liveReloadServer = startLiveReloadServer(initialInputHash);
  watch(
    [ inputFile, assetsPath ],
    { cwd: Deno.cwd() },
    {
      all: (event: string, path: string): void => {
        logInfo('=====================================================================');
        logInfo(stoyle`File ${path} received event ${event}`({ nodes: [ theme.strong, theme.strong ] }));
        state.queue = state.queue.then(async () => {
          const { inputHash: newInputHash } = await asciidocToReveal(inputFile, outputFile, { shouldAddLiveReload: true });
          liveReloadServer.reload(newInputHash);
        });
      },
    },
  );
}

// noinspection JSUnusedGlobalSymbols
export default {
  command,
  aliases: [ 'w' ],
  describe: 'Watch a file containing an asciidoc presentation and convert it to an HTML presentation',
  builder,
  handler,
};
