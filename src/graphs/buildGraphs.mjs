import { run } from '@mermaid-js/mermaid-cli';
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import jsdom from 'jsdom';
import { resolve } from 'path';
import { stoyle } from 'stoyle';
import { $, removeFromParent } from '../domUtils.mjs';

import { BUILD_AREA_PATH } from '../folders.mjs';
import { logWarn, theme } from '../log.mjs';

const MERMAID_CONFIGURATION = {
  quiet: true,
  outputFormat: 'svg',
  puppeteerConfig: {
    headless: 'new',
  },
  parseMMDOptions: {
    backgroundColor: 'transparent',
    myCSS: undefined,
    mermaidConfig: {
      logLevel: 'error',
      securityLevel: 'loose',
      startOnLoad: false,
      deterministicIds: true,
    },
  },
};

export default async function buildGraphs (dom, { graphsRegister, graphAnimationsRegister, graphTypes }) {
  const graphEntries = Object.entries(graphsRegister);
  if (!graphEntries.length) { return dom; }

  const graphTypesWithPotentialDuplicates = await Promise.all(
    graphEntries
      .map(([ graphId, graphText ]) => processGraph(dom, graphId, graphText, graphAnimationsRegister)),
  );
  [ ...new Set(graphTypesWithPotentialDuplicates) ].forEach((graphType) => graphTypes.push(graphType));

  const animationsWithNoGraph = Object.keys(graphAnimationsRegister)
    .filter((graphAnimationId) => !graphsRegister[ graphAnimationId ]);
  if (animationsWithNoGraph.length) {
    logWarn(stoyle`Graph animations [ ${animationsWithNoGraph.join(', ')} ] are linked to no known graph`({ nodes: [ theme ] }));
  }

  return dom;
}

/**
 * Generates the SVG definition of a graph, and substitutes the corresponding code block for the graph.
 * Returns the graph type so the caller can add the appropriate CSS.
 */
async function processGraph (dom, graphId, graphText, graphAnimationsRegister) {
  const graphContainerNode = $(dom, `#graph-${graphId}`);
  delete graphContainerNode.id;
  graphContainerNode.innerHTML = await mermaidToSvg(graphId, graphText);
  const graphNode = graphContainerNode.childNodes[ 0 ];
  const graphType = graphNode.getAttribute('aria-roledescription');

  (graphAnimationsRegister[ graphId ] || [])
    .forEach((animation) => animateNodes(graphId, graphNode, animation));

  return graphType;
}

/**
 * Builds an SVG definition for a given Mermaid graph.
 * SVG files are built in the build-area and IDed with a hash of the mermaid code.
 * This pollutes the build area a bit, but allows the builder to skip rebuilds when the mermaid code doesn't change.
 */
async function mermaidToSvg (graphId, graphCode) {
  const graphCodeHash = createHash('md5')
    .update(graphCode)
    .digest('hex')
    .substring(0, 12);

  const inputFilePath = resolve(BUILD_AREA_PATH, `${graphId}.mermaid`);
  const outputFilePath = resolve(BUILD_AREA_PATH, `${graphId}_${graphCodeHash}.svg`);

  if (!existsSync(outputFilePath)) {
    writeFileSync(inputFilePath, graphCode, 'utf8');
    await run(inputFilePath, outputFilePath, MERMAID_CONFIGURATION);
    const initialSvg = readFileSync(outputFilePath, 'utf8');
    const dom = new jsdom.JSDOM(initialSvg);
    const graphNode = $(dom, 'svg');
    addDiagramTweaks(graphNode, graphId);
    writeFileSync(outputFilePath, graphNode.outerHTML);
  }

  return readFileSync(outputFilePath, 'utf8');
}

function addDiagramTweaks (graphNode, graphId) {
  const graphType = graphNode.getAttribute('aria-roledescription');
  graphNode.id = `graph-${graphId}`;
  graphNode.classList.add(graphType);
  removeFromParent(graphNode.querySelector('style')); // Added globally to avoid duplication

  switch (graphType) {
    case 'flowchart-v2':
      const firstRootNode = graphNode.querySelector('g>g.root');
      firstRootNode.classList.add('top-level'); // Mark top-level root for easier access!
      return;
    default:
      return;
  }
}

function animateNodes (graphId, graphNode, animation) {
  const { selector, classes = [], attributes = {} } = animation;
  const elementsToAnimate = [ ...graphNode.querySelectorAll(selector) ];
  if (!elementsToAnimate.length) {
    logWarn(stoyle`Could not animate elements defined by ${selector} in graph ${graphId}, not found.`({ nodes: [ theme.strong, theme.strong ] }));
    return;
  }

  elementsToAnimate.forEach((elementToAnimate) => {
    elementToAnimate.classList.add(...classes);
    Object.entries(attributes)
      .forEach(([ key, value ]) => elementToAnimate.setAttribute(key, value));
  });
}
