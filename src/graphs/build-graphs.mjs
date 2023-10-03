import { createHash } from 'crypto';
import { resolve } from 'path';
import { run } from '@mermaid-js/mermaid-cli';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import { BUILD_AREA_PATH } from '../folders.mjs';
import { $, $$, removeFromParent } from '../domUtils.mjs';

const MERMAID_CONFIGURATION = {
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

export async function buildGraphs (dom) {
  const graphContainers = $$(dom, '.graph');
  if (!graphContainers.length) { return dom; }

  return graphContainers.reduce(
    (promise, graphContainer, index) => promise.then(async (seed) => processGraph(seed, graphContainer, index)),
    Promise.resolve(dom),
  );
}

/**
 * Retrieves the mermaid code in a code block annotated with role 'graph'.
 * Generates the corresponding SVG definition, and substitutes the code block for the graph.
 */
async function processGraph (dom, graphContainerNode, graphIndex) {
  const graphNode = graphContainerNode.querySelector('code');

  const graphId = [ ...graphContainerNode.classList.values() ]
    .find((clazz) => clazz.startsWith('graph-id-')) || `graph-id-${graphIndex}`;

  const graphCode = graphNode.innerHTML.replaceAll('&gt;', '>'); // Auto-replaced by JSDom when injected in the code block!
  graphContainerNode.innerHTML = await mermaidToSvg(graphId, graphCode);
  const newGraphNode = graphContainerNode.childNodes[ 0 ];

  const animationNode = $(dom, `.graph-animation.${graphId}`);
  if (animationNode) {
    animateGraph(graphId, newGraphNode, animationNode);
  }

  return dom;
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
  }

  return readFileSync(outputFilePath, 'utf8');
}

function animateGraph (graphId, graphNode, animationNode) {
  const animationCodeNode = animationNode.querySelector('code');
  const animationCode = animationCodeNode.innerHTML;

  JSON.parse(animationCode).forEach((animation) => animateNode(graphId, graphNode, animation));

  removeFromParent(animationNode);
  console.log();
}

function animateNode (graphId, graphNode, animation) {
  const elementToAnimate = graphNode.querySelector(animation.selector);
  if (!elementToAnimate) {
    console.warn(`Could not animate element ${animation.selector} in graph ${graphId}, not found.`);
    return;
  }

  elementToAnimate.classList.add(...animation.classes);
  Object.entries(animation.attributes)
    .forEach(([ key, value ]) => elementToAnimate.setAttribute(key, value));
}
