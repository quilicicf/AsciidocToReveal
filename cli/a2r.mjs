#!/usr/bin/env node

import yargs from 'npm:yargs';
import { logError } from '../src/third-party/logger/api.mjs';

import * as build from './build.mjs';
import * as watch from './watch.mjs';

async function main () {
  const ignore = yargs(Deno.args)
    .usage('Usage: a2r <command> [options]')
    .command(build)
    .command(watch)
    .demandCommand(1, 'Specify the command you want to run!')
    .strictCommands()
    .help()
    .version()
    .epilogue('For more information, read the manual at https://github.com/quilicicf/AsciidocToReveal')
    .wrap(null)
    .argv;
}

main()
  .catch((error) => {
    logError(`Failed with error:\n${error.stack}`);
    Deno.exit(1);
  });
