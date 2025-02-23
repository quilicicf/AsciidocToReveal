#!/usr/bin/env deno

import { stoyle } from 'stoyle';

import { LIB_FOLDER } from '../src/paths.ts';
import { toDom } from '../src/third-party/dom/api.ts';
import { writeTextFileSync } from '../src/third-party/fs/api.ts';
import { logInfo, theme } from '../src/third-party/logger/log.ts';
import { resolve } from '../src/third-party/path/api.ts';
import { createMermaidProcessor, MermaidProcessor, MermaidCliConfig } from '../src/third-party/mermaid/api.ts';

const MERMAID_DARK_CONFIGURATION: MermaidCliConfig = {
  backgroundColor: 'transparent',
  mermaidConfig: {
    theme: 'dark',
    darkMode: true,
    logLevel: 'error',
    securityLevel: 'loose',
    startOnLoad: false,
    deterministicIds: true,
    htmlLabels: false,
  },
};

const MERMAID_LIGHT_CONFIGURATION: MermaidCliConfig = {
  backgroundColor: 'transparent',
  mermaidConfig: {
    theme: 'default', // TODO: support light themes
    darkMode: false, // TODO: support light themes
    logLevel: 'error',
    securityLevel: 'loose',
    startOnLoad: false,
    deterministicIds: true,
    htmlLabels: false,
  },
};

const DIAGRAMS_TO_BUILD: Record<string, string> = {
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
  error: 'error',
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

const MERMAID_PROCESSOR: MermaidProcessor = await createMermaidProcessor();

async function main () {
  const DIAGRAMS_PATH = resolve(LIB_FOLDER, 'diagrams');

  await Promise.all(
    Object.entries(DIAGRAMS_TO_BUILD)
      .map(async ([ key, diagram ]) => {
        logInfo(stoyle`Processing diagram ${key}`({ nodes: [ theme.strong ] }));
        await processDiagram(`${key}_dark`, diagram, resolve(DIAGRAMS_PATH, `${key}_dark.css`), MERMAID_DARK_CONFIGURATION);
        await processDiagram(`${key}_light`, diagram, resolve(DIAGRAMS_PATH, `${key}_light.css`), MERMAID_LIGHT_CONFIGURATION);
      }),
  );

  await MERMAID_PROCESSOR.close();
}

async function processDiagram (id: string, diagram: string, outputFilePath: string, config: MermaidCliConfig): Promise<void> {
  const svg = await MERMAID_PROCESSOR.render(diagram, id, config);
  const dom = toDom(svg);
  const style = dom.select('style')?.innerHTML;
  const diagramType = dom.select('svg')?.getAttribute('aria-roledescription');
  const updatedStyle = style?.replaceAll(`#${id}`, `svg.${diagramType}`);

  if (updatedStyle === undefined) {
    throw Error(`No style for ${id}`);
  }

  writeTextFileSync(outputFilePath, updatedStyle);
}

function stripIndent (edges: TemplateStringsArray, ...nodes: string[]): string {
  const fullString = edges
    .reduce((seed, edge, index) => seed + edge + nodes[ index ] || '')
    .replace(/^\n/g, '');
  const lines = fullString.split('\n');
  const minimalIndent = lines
    .filter((line) => !/^ +$/.test(line))
    .map((line) => /^( +)/.exec(line)?.[ 1 ]?.length as number)
    .reduce((seed, leadingBlanksNumber) => seed < leadingBlanksNumber ? seed : leadingBlanksNumber, 1000);
  return [ ...lines, '' ]
    .map((line) => line.substring(minimalIndent), '')
    .join('\n');
}

main()
  .catch((error) => {
    console.error(`Failed with error: ${error.stack}\n`);
    Deno.exit(1);
  });
