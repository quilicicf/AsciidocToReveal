import { run } from 'npm:@mermaid-js/mermaid-cli';

import { hashString } from '../third-party/crypto/api.mjs';
import { MIME_TYPES, removeFromParent, toDom } from '../third-party/dom/api.mjs';
import { existsSync, readTextFileSync, writeTextFileSync } from '../third-party/fs/api.mjs';
import { _, logWarn, theme } from '../third-party/logger/api.mjs';
import { resolve } from '../third-party/path/api.mjs';

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

export default async function buildGraphs (dom, deck) {
  const { graphsRegister, graphAnimationsRegister, graphTypes } = deck;
  const graphEntries = Object.entries(graphsRegister);
  if (!graphEntries.length) { return dom; }

  const graphTypesWithPotentialDuplicates = await Promise.all(
    graphEntries
      .map(([ graphId, graphText ]) => processGraph(dom, graphId, graphText, deck)),
  );
  [ ...new Set(graphTypesWithPotentialDuplicates) ].forEach((graphType) => graphTypes.push(graphType));

  const animationsWithNoGraph = Object.keys(graphAnimationsRegister)
    .filter((graphAnimationId) => !graphsRegister[ graphAnimationId ]);
  if (animationsWithNoGraph.length) {
    logWarn(_`Graph animations [ ${animationsWithNoGraph.join(', ')} ] are linked to no known graph`({ nodes: [ theme ] }));
  }

  return dom;
}

/**
 * Generates the SVG definition of a graph, and substitutes the corresponding code block for the graph.
 * Returns the graph type so the caller can add the appropriate CSS.
 */
async function processGraph (dom, graphId, graphText, deck) {
  const graphContainerNode = dom.select(`#graph-${graphId}`);
  delete graphContainerNode.id;
  graphContainerNode.innerHTML = await mermaidToSvg(graphId, graphText, deck);
  const graphNode = graphContainerNode.childNodes[ 0 ];
  const graphType = graphNode.getAttribute('aria-roledescription');

  (deck.graphAnimationsRegister[ graphId ] || [])
    .forEach((animation) => animateNodes(graphId, graphNode, animation));

  return graphType;
}

/**
 * Builds an SVG definition for a given Mermaid graph.
 * SVG files are built in the build-area and IDed with a hash of the mermaid code.
 * This pollutes the build area a bit, but allows the builder to skip rebuilds when the mermaid code doesn't change.
 */
async function mermaidToSvg (graphId, graphCode, { cachePath }) {
  const graphCodeHash = await hashString(graphCode);
  const inputFilePath = resolve(cachePath, `${graphId}.mermaid`);
  const outputFilePath = resolve(cachePath, `${graphId}_${graphCodeHash}.svg`);

  if (!existsSync(outputFilePath)) {
    writeTextFileSync(inputFilePath, graphCode);
    await run(inputFilePath, outputFilePath, MERMAID_CONFIGURATION);
    const dom = readTextFileSync(outputFilePath, (svg) => toDom(svg, MIME_TYPES.HTML)); // FIXME: hack
    const graphNode = dom.select('svg');
    addDiagramTweaks(graphNode, graphId);
    writeTextFileSync(outputFilePath, graphNode.outerHTML);
  }

  return readTextFileSync(outputFilePath);
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
    logWarn(_`Could not animate elements defined by ${selector} in graph ${graphId}, not found.`({ nodes: [ theme.strong, theme.strong ] }));
    return;
  }

  const defaultClassesToAdd = [ 'fragment', 'fade-in' ];
  elementsToAnimate.forEach((elementToAnimate) => {
    const classesToAdd = classes.length ? classes : defaultClassesToAdd;
    elementToAnimate.classList.add(...classesToAdd);
    Object.entries(attributes)
      .forEach(([ key, value ]) => elementToAnimate.setAttribute(key, value));
  });
}
