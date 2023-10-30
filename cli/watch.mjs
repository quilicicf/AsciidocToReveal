import { stoyle } from 'stoyle';

import { REPOSITORY_ROOT_PATH } from '../src/folders.mjs';
import { hashString } from '../src/third-party/crypto/api.mjs';
import { existsSync, readTextFileSync, watch } from '../src/third-party/fs/api.mjs';
import { logInfo, theme } from '../src/third-party/logger/log.mjs';
import { resolve } from '../src/third-party/path/api.mjs';
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
    .option('assets-folder', {
      alias: 'a',
      type: 'string',
      describe: 'The relative path from the asciidoc deck to the assets folder. Will trigger a re-build for changes inside the assets folder too',
      requiresArg: true,
      demandOption: false,
    })
    .check(function checker (argv, currentArgs) {
      const assetsFolder = currentArgs?.assetsFolder;
      if (assetsFolder) {
        const assetsFolderAbsolutePath = resolve(currentArgs.inputFile, '..', assetsFolder);
        if (!existsSync(assetsFolderAbsolutePath)) {
          throw Error(`Cannot find assets folder, does it exist?`);
        }
      }
      return true;
    })
    .help()
    .wrap(null);
}

export async function handler (args) {
  const { inputFile, outputFile, assetsFolder } = args;

  const state = {
    queue: Promise.resolve(),
  };

  const initialInputHash = readTextFileSync(inputFile, hashString);
  const liveReloadServer = startLiveReloadServer(initialInputHash);

  const additionalWatchedPaths = assetsFolder
    ? [ resolve(inputFile, '..', assetsFolder, '*') ]
    : [];

  logInfo(stoyle`Watcher started on ${inputFile}`({ nodes: [ theme.strong ] }));
  if (additionalWatchedPaths.length) {
    logInfo(stoyle`Also watching [ ${additionalWatchedPaths} ]`({ nodes: [ theme.strong ] }));
  }

  const { asciidocToReveal } = await import ('../src/asciidocToReveal.mjs'); // Delay pulling all the dependencies because it's super heavy
  watch(
    [ inputFile, ...additionalWatchedPaths ],
    {
      cwd: REPOSITORY_ROOT_PATH,
    },
    {
      all: (event, path) => {
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
