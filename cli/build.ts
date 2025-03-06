import { Arguments } from 'yargs/deno-types.ts';
import { YargsInstance } from 'yargs/build/lib/yargs-factory.js';

import { ArgumentName, CLI_ARGUMENTS } from './common.ts';

export const command = 'build';

function builder (yargs: YargsInstance) {
  return yargs
    .usage(`a2r ${command} [options]`)
    .option(ArgumentName.INPUT_FILE, CLI_ARGUMENTS[ ArgumentName.INPUT_FILE ])
    .option(ArgumentName.OUTPUT_FILE, CLI_ARGUMENTS[ ArgumentName.OUTPUT_FILE ])
    .help()
    .wrap(null);
}

async function handler (args: Arguments) {
  const { inputFile, outputFile: outputFileArg } = args;

  const outputFile = outputFileArg || inputFile.replace(/\.[^.]+$/, '.html');

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
