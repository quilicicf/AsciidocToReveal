#!/usr/bin/env node

import { run } from '@mermaid-js/mermaid-cli';
import jsdom from 'jsdom';
import { resolve } from 'path';
import { stoyle } from 'stoyle';
import { $ } from '../src/domUtils.mjs';
import { LIB_FOLDER } from '../src/folders.mjs';
import { readTextFileSync, writeTextFileSync } from '../src/third-party/fs/api.mjs';
import { logInfo, theme } from '../src/log.mjs';

const MERMAID_DARK_CONFIGURATION = {
  quiet: true,
  outputFormat: 'svg',
  puppeteerConfig: {
    headless: 'new',
  },
  parseMMDOptions: {
    backgroundColor: 'transparent',
    myCSS: undefined, // TODO: add some if necessary
    mermaidConfig: {
      theme: 'dark', // TODO: support light themes
      darkMode: true, // TODO: support light themes
      logLevel: 'error',
      securityLevel: 'loose',
      startOnLoad: false,
      deterministicIds: true,
    },
  },
};

const MERMAID_LIGHT_CONFIGURATION = {
  quiet: true,
  outputFormat: 'svg',
  puppeteerConfig: {
    headless: 'new',
  },
  parseMMDOptions: {
    backgroundColor: 'transparent',
    myCSS: undefined, // TODO: add some if necessary
    mermaidConfig: {
      theme: 'default', // TODO: support light themes
      darkMode: false, // TODO: support light themes
      logLevel: 'error',
      securityLevel: 'loose',
      startOnLoad: false,
      deterministicIds: true,
    },
  },
};

const DIAGRAMS_TO_BUILD = {
  c4: stripIndent`
      C4Context
        title System Context diagram for Internet Banking System
    `,
  classDiagram: stripIndent`
      classDiagram
        note "From Duck till Zebra"
    `,
  er: stripIndent`
    erDiagram
      CUSTOMER ||--o{ ORDER : places
  `,
  'flowchart-v2': stripIndent`
    flowchart LR
      id
  `,
  gantt: stripIndent`
    gantt
      title A Gantt Diagram
  `,
  gitGraph: stripIndent`
    gitGraph
      commit
  `,
  mindmap: stripIndent`
    mindmap
      root((mindmap))
  `,
  pie: stripIndent`
    pie title Pets adopted by volunteers
  `,
  quadrantChart: stripIndent`
    quadrantChart
      title Reach and engagement of campaigns
  `,
  requirement: stripIndent`
    requirementDiagram
      requirement test_req {
        id: 1
        text: the test text.
        risk: high
        verifymethod: test
      }
  `,
  sankey: stripIndent`
    sankey-beta
    Agricultural 'waste',Bio-conversion,124.729
  `,
  sequence: stripIndent`
    sequenceDiagram
      Alice->>John: Hello John, how are you?
  `,
  stateDiagram: stripIndent`
    stateDiagram-v2
      [*] --> Still
      Still --> [*]
  `,
  timeline: stripIndent`
    timeline
      title History of Social Media Platform
  `,
  journey: stripIndent`
    journey
      title My working day
  `,
};

async function main () {
  const DIAGRAMS_PATH = resolve(LIB_FOLDER, 'diagrams');

  await Promise.all(
    Object.entries(DIAGRAMS_TO_BUILD)
      .map(async ([ key, diagram ]) => {
        logInfo(stoyle`Processing diagram ${key}`({ nodes: [ theme.strong ] }));

        const inputFilePath = `/tmp/${key}.mermaid`;
        writeTextFileSync(inputFilePath, diagram);
        await processDiagram(inputFilePath, `/tmp/${key}_dark.svg`, resolve(DIAGRAMS_PATH, `${key}_dark.css`), MERMAID_DARK_CONFIGURATION);
        await processDiagram(inputFilePath, `/tmp/${key}_light.svg`, resolve(DIAGRAMS_PATH, `${key}_light.css`), MERMAID_LIGHT_CONFIGURATION);
      }),
  );
}

async function processDiagram (inputFilePath, svgFilePath, outputFilePath, mermaidConfiguration) {
  await run(inputFilePath, svgFilePath, mermaidConfiguration);
  const svg = readTextFileSync(svgFilePath);
  const dom = new jsdom.JSDOM(svg);
  const style = $(dom, 'style').innerHTML;
  const diagramType = $(dom, 'svg').getAttribute('aria-roledescription');
  const updatedStyle = style.replaceAll('#my-svg', `svg.${diagramType}`);
  writeTextFileSync(outputFilePath, updatedStyle);
}

function stripIndent (edgesArray, ...nodes) {
  const edges = [ ...edgesArray ];
  const fullString = edges
    .reduce((seed, edge, index) => seed + edge + nodes[ index ] || '')
    .replace(/^\n/g, '');
  const lines = fullString.split('\n');
  const minimalIndent = lines
    .filter((line) => !/^ +$/.test(line))
    .map((line) => /^( *)/.exec(line)[ 1 ].length)
    .reduce((seed, leadingBlanksNumber) => seed < leadingBlanksNumber ? seed : leadingBlanksNumber, 1000);
  return [ ...lines, '' ]
    .map((line) => line.substring(minimalIndent), '')
    .join('\n');
}

main()
  .catch((error) => {
    process.stderr.write(`Failed with error: ${error.stack}\n`);
    process.exit(1);
  });
