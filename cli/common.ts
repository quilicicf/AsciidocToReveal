import { existsSync, FileSystemPath } from '../src/third-party/file-system/api.ts';

export enum ArgumentName {
  INPUT_FILE = 'input-file',
  OUTPUT_FILE = 'output-file',
}

interface Option<T> {
  alias: string;
  type: string;
  describe: string;
  requiresArg: boolean;
  demandOption: boolean;
  coerce?: (value: string) => T;
}

export const CLI_ARGUMENTS: Record<ArgumentName, Option<unknown>> = {
  [ ArgumentName.INPUT_FILE ]: {
    alias: 'i',
    type: 'string',
    describe: 'The path to the input file containing the asciidoc deck',
    requiresArg: true,
    demandOption: true,
    coerce (filePath: string): string {
      if (!existsSync(filePath as FileSystemPath)) {
        throw Error(`The input file was not found`);
      }
      return filePath;
    },
  } as Option<string>,
  [ ArgumentName.OUTPUT_FILE ]: {
    alias: 'o',
    type: 'string',
    describe: 'The path where the output HTML deck is written, defaults to input file with extension changed',
    requiresArg: true,
    demandOption: false,
  } as Option<string>,
};
