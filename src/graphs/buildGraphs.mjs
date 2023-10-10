import { run } from '@mermaid-js/mermaid-cli';
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { stoyle } from 'stoyle';
import { $$ } from '../domUtils.mjs';

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

export default async function buildGraphs (dom, { graphAnimationsRegister }) {
  const graphContainers = $$(dom, '.graph');
  if (!graphContainers.length) { return dom; }

  return graphContainers.reduce(
    (promise, graphContainer) => promise.then(async (seed) => processGraph(seed, graphContainer, graphAnimationsRegister)),
    Promise.resolve(dom),
  );
}

/**
 * Retrieves the mermaid code in a code block annotated with role 'graph'.
 * Generates the corresponding SVG definition, and substitutes the code block for the graph.
 */
async function processGraph (dom, graphContainerNode, graphAnimationsRegister) {
  const graphNode = graphContainerNode.querySelector('code');

  const graphId = [ ...graphContainerNode.classList.values() ]
    .find((clazz) => clazz.startsWith('graph-id-'));

  const graphCode = graphNode.innerHTML.replaceAll('&gt;', '>'); // Auto-replaced by JSDom when injected in the code block!
  graphContainerNode.innerHTML = await mermaidToSvg(graphId, graphCode);
  const newGraphNode = graphContainerNode.childNodes[ 0 ];

  (graphAnimationsRegister[ graphId ] || [])
    .forEach((animation) => animateNodes(graphId, newGraphNode, animation));

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
