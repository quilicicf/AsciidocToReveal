import { existsSync, mkdirSync } from '../src/third-party/fs/api.mjs';
import { getParentFolderName } from '../src/third-party/path/api.mjs';

export const command = 'build';
export const aliases = [ 'b' ];
export const describe = 'Build an HTML presentation from an asciidoc presentation';

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

  const outputFolder = getParentFolderName(outputFile);
  mkdirSync(outputFolder, { recursive: true });

  const { asciidocToReveal } = await import ('../src/asciidocToReveal.mjs'); // Delay pulling all the dependencies because it's super heavy
  await asciidocToReveal(inputFile, outputFile);
}
