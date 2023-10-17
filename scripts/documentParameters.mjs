#!/usr/bin/env node

import { resolve } from 'path';

import { deckConfiguration } from '../src/asciidoc/configuration/deckConfiguration.mjs';
import { TEST_FOLDER } from '../src/folders.mjs';
import { readTextFileSync, writeTextFileSync } from '../src/third-party/fs/api.mjs';

const START_TAG = '// START PARAMETERS DOCUMENTATION';
const END_TAG = '// END PARAMETERS DOCUMENTATION';

async function main () {
  const tableContent = Object.entries(deckConfiguration)
    .map(([ , { id, documentation, defaultValue, acceptedValues } ]) => ([
      `| \`${id}\``,
      `| ${defaultValue}`,
      `| ${Array.isArray(acceptedValues) ? acceptedValues.join(', ') : acceptedValues}`,
      `| ${documentation}`,
      '',
    ]))
    .flat(1)
    .join('\n');
  const table = [
    '[cols="2,1,3,2",role=extra-small]',
    '|===',
    '| Option | Default value | Accepted values | Description',
    '',
    tableContent,
    '|===',
  ].join('\n');
  const deckPath = resolve(TEST_FOLDER, 'deck.adoc');
  const deckContent = readTextFileSync(deckPath);
  const updatedDeckContent = substituteInDeck(deckContent, START_TAG, END_TAG, table);
  writeTextFileSync(deckPath, updatedDeckContent);
}

function substituteInDeck (deckContent, startTag, endTag, value) {
  const regex = new RegExp(`${startTag}.*?${endTag}`, 'gs');
  return deckContent.replace(regex, `${startTag}\n${value}\n${endTag}`);
}

main()
  .catch((error) => {
    process.stderr.write(`Failed with error: ${error.stack}\n`);
    process.exit(1);
  });
