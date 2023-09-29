#!/usr/bin/env node

import { asciidocToReveal } from './src/asciidocToReveal.mjs';

async function main () {
  const [ , , inputPath ] = process.argv;
  await asciidocToReveal(inputPath);
}

main()
  .catch((error) => {
    process.stderr.write(`Failed with error: ${error.stack}\n`);
    process.exit(1);
  });
