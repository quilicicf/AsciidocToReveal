#!/usr/bin/env node

import yargs from 'yargs';

import * as build from './build.mjs';
import * as watch from './watch.mjs';

async function main () {
  const cliArguments = process.argv.slice(2);
  const ignore = yargs(cliArguments)
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
    process.stderr.write(`Failed with error: ${error.stack}\n`);
    process.exit(1);
  });
