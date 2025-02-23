#!/usr/bin/env node

import yargs from "yargs/deno.ts";

import build from './build.ts';
import watch from './watch.ts';

async function main () {
  await yargs(Deno.args)
    .usage('Usage: a2r <command> [options]')
    .command(build)
    .command(watch)
    .demandCommand(1, 'Specify the command you want to run!')
    .strictCommands()
    .help()
    .version()
    .epilogue('For more information, read the manual at https://github.com/quilicicf/AsciidocToReveal')
    .wrap(null)
    .parse();
}

main()
  .catch((error) => {
    console.error(`Failed with error: ${error.stack}\n`);
    Deno.exit(1);
  });
