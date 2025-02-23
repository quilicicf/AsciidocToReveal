#!/usr/bin/env deno

import { deckConfiguration } from '../src/asciidoc/configuration/deckConfiguration.ts';
import { TEST_FOLDER } from '../src/paths.ts';
import { readTextFileSync, writeTextFileSync } from '../src/third-party/fs/api.ts';
import { resolve } from '../src/third-party/path/api.ts';

const START_TAG = '// START PARAMETERS DOCUMENTATION';
const END_TAG = '// END PARAMETERS DOCUMENTATION';

function main () {
  const tableContent = Object.entries(deckConfiguration)
    .map(([ , { id, documentation, defaultValue, acceptedValues } ]) => ([
      `| \`${id}\``,
      `| ${Array.isArray(defaultValue) ? JSON.stringify(defaultValue, null, 2) : defaultValue}`,
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

function substituteInDeck (deckContent: string, startTag: string, endTag: string, value: string): string {
  const regex = new RegExp(`${startTag}.*?${endTag}`, 'gs');
  return deckContent.replace(regex, `${startTag}\n${value}\n${endTag}`);
}

main();
