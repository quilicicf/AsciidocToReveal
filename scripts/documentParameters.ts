#!/usr/bin/env deno

import { deckConfigurationBuilder } from '../src/asciidoc/configuration/deckConfiguration.ts';
import { TEST_FOLDER } from '../src/paths.ts';
import { readTextFileSync, writeTextFileSync } from '../src/third-party/fs/api.ts';
import { resolve } from '../src/third-party/path/api.ts';

interface Tags {
  start: string;
  end: string;
}

const TAGS: Tags[] = new Array(2)
  .fill(null)
  .map((_value, indexBaseZero) => ({
    start: `// START PARAMETERS DOCUMENTATION ${indexBaseZero + 1}`,
    end: `// END PARAMETERS DOCUMENTATION ${indexBaseZero + 1}`,
  }));

function main () {
  const deckPath = resolve(TEST_FOLDER, 'deck.adoc');
  const deckContent = readTextFileSync(deckPath);
  const updatedDeckContent = TAGS.reduce(
    (seed, tags, index) => substituteInDeck(seed, tags, toTable(index + 1)),
    deckContent,
  );

  writeTextFileSync(deckPath, updatedDeckContent);
}

function toTable (pageToBuild: number) {
  const tableContent = Object.entries(deckConfigurationBuilder)
    .filter(([ , { pageNumber } ]) => pageToBuild === pageNumber)
    .map(([ , { id, documentation, displayDefaultValue, acceptedValues } ]) => ([
      `| \`${id}\``,
      `| ${displayDefaultValue}`,
      `| ${Array.isArray(acceptedValues) ? acceptedValues.join(', ') : acceptedValues}`,
      `| ${documentation}`,
      '',
    ]))
    .flat(1)
    .join('\n');

  return [
    '[cols="2,1,3,2",role=extra-small]',
    '|===',
    '| Option | Default value | Accepted values | Description',
    '',
    tableContent,
    '|===',
  ].join('\n');
}

function substituteInDeck (deckContent: string, tags: Tags, value: string): string {
  const regex = new RegExp(`${tags.start}.*?${tags.end}`, 'gs');
  return deckContent.replace(regex, `${tags.start}\n${value}\n${tags.end}`);
}

main();
