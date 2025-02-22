import { hashString } from '../third-party/crypto/api.mjs';
import { toDom } from '../third-party/dom/api.mjs';
import { existsSync, readTextFileSync, writeTextFileSync } from '../third-party/fs/api.mjs';
import { _, logError, logWarn, theme } from '../third-party/logger/log.mjs';
import { resolve } from '../third-party/path/api.mjs';
import { createMermaidProcessor } from './mermaid.mjs';

/** @type {A2R.MermaidProcessor} */
let MERMAID_PROCESSOR;

/**
 * @param dom {A2R.Dom}
 * @param deck {A2R.Deck}
 * @returns {Promise<A2R.Dom>}
 */
export default async function buildGraphs (dom, deck) {
  const { graphsRegister, graphAnimationsRegister, graphTypes, svgIcons } = deck;
  const graphEntries = Object.entries(graphsRegister);
  if (!graphEntries.length) { return dom; }

  MERMAID_PROCESSOR = await createMermaidProcessor();
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

  if (!deck.buildOptions.shouldAddLiveReload) {
    await MERMAID_PROCESSOR.close(); // Close when building, keep open when watching
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
  const graphCodeHash = hashString(graphCode);
  const inputFilePath = resolve(cachePath, `${graphId}.mermaid`);
  const outputFilePath = resolve(cachePath, `${graphId}_${graphCodeHash}.svg`);

  if (!existsSync(outputFilePath)) {
    writeTextFileSync(inputFilePath, graphCode);
    try {
      const { data } = await MERMAID_PROCESSOR.render(graphCode, `graph-${graphId}`);
      writeTextFileSync(outputFilePath, new TextDecoder().decode(data));
    } catch (error) {
      logError(_`Failed processing graph ${graphId}: ${error.message}`({ nodes: [ theme.strong, theme.error ] }));
      return writeErrorGraph(cachePath);
    }

    const dom = readTextFileSync(outputFilePath, (svg) => toDom(svg));
    const graphNode = dom.select('svg');
    addDiagramTweaks(graphNode, dom);
    writeTextFileSync(outputFilePath, graphNode.outerHTML);
  }

  return readTextFileSync(outputFilePath);
}

async function writeErrorGraph (cachePath) {
  const outputFilePath = resolve(cachePath, 'error.svg');

  if (existsSync(outputFilePath)) {
    return readTextFileSync(outputFilePath);
  }

  const errorGraph = await MERMAID_PROCESSOR.render('error', 'mermaid-error');
  writeTextFileSync(outputFilePath, errorGraph);
  return readTextFileSync(outputFilePath);
}

function addDiagramTweaks (graphNode, dom) {
  const graphType = graphNode.getAttribute('aria-roledescription');
  graphNode.classList.add(graphType);

  dom.selectAll('marker > path') // Colors arrow heads like their tails
    .forEach((markerPath) => markerPath.setAttribute('fill', 'context-stroke'));

  dom.selectAll('svg[data-inject]') // FIXME : SVG injection should not work anymore (htmlLabels false).
    .forEach((node) => node.innerHTML = `<use href="#${node.getAttribute('data-inject')}"/>`);

  dom.selectAll('svg[data-icon-label]') // FIXME : use icon shapes instead
    .forEach((node) => {
      const iconName = node.getAttribute('data-icon-label');
      const requestedIconSize = parseInt(node.getAttribute('height'), 10);
      const iconSize = Math.round(requestedIconSize / 1.4); // Leave vertical padding
      node.outerHTML = `
        <div class="icon-label">
          <svg height="${requestedIconSize}" width="1"/>
          <svg width="${iconSize}" height="${iconSize}">
            <use href="#${iconName}-icon"/>            
          </svg>
          &nbsp;&nbsp;
          <span style="font-size:${Math.round(iconSize / 1.7)}px">${node.textContent}</span>
          &nbsp;&nbsp;
        </div>
      `;
    });

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
