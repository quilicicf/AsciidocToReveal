import { YargsInstance, ArgumentsCamelCase } from 'npm:yargs';

import { existsSync, mkdirSync } from '../src/third-party/fs/api.ts';
import { getParentFolderName } from '../src/third-party/path/api.ts';

export const command = 'build';

interface Args {
  inputFile: string;
  outputFile: string;
}

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

async function handler (args: ArgumentsCamelCase<Args>) {
  const { inputFile, outputFile } = args;

  const outputFolder = getParentFolderName(outputFile);
  mkdirSync(outputFolder, { recursive: true });

  const { asciidocToReveal } = await import ('../src/asciidocToReveal.ts'); // Delay pulling all the dependencies because it's super heavy
  await asciidocToReveal(inputFile, outputFile);
}

// noinspection JSUnusedGlobalSymbols
export default {
  command,
  aliases: [ 'b' ],
  describe: 'Build an HTML presentation from an asciidoc presentation',
  builder,
  handler,
};
