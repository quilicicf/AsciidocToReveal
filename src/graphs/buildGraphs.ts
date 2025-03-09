import { hashString } from '../third-party/crypto/api.ts';
import { removeFromParent, toDom } from '../third-party/dom/api.ts';
import {
  existsSync, FileSystemPath,
  readTextFileSync,
  readTextFileSyncAndConvert,
  resolve,
  writeTextFileSync,
} from '../third-party/file-system/api.ts';
import { _, logError, logWarn, theme } from '../third-party/logger/log.ts';
import { createMermaidProcessor, MermaidProcessor } from '../third-party/mermaid/api.ts';
import { Deck, Dom, GraphAnimation } from '../domain/api.ts';

let MERMAID_PROCESSOR: MermaidProcessor;

export default async function buildGraphs (dom: Dom, deck: Deck): Promise<Dom> {
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
    logWarn(_`Graph animations [ ${animationsWithNoGraph.join(', ')} ] are linked to no known graph`({ nodes: [ theme.strong ] }));
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
async function processGraph (dom: Dom, graphId: string, graphText: string, deck: Deck): Promise<string> {
  const graphContainerNode = dom.select(`#graph-${graphId}`) as Element;
  // @ts-ignore We absolutely can remove the ID
  delete graphContainerNode.id;
  graphContainerNode.innerHTML = await mermaidToSvg(graphId, graphText, deck);
  const graphNode = graphContainerNode.childNodes[ 0 ] as Element;
  const graphType = graphNode.getAttribute('aria-roledescription');

  (deck.graphAnimationsRegister[ graphId ] || [])
    .forEach((animation) => animateNodes(graphId, graphNode, animation));

  return graphType || '';
}

/**
 * Builds an SVG definition for a given Mermaid graph.
 * SVG files are built in the build-area and IDed with a hash of the mermaid code.
 * This pollutes the build area a bit, but allows the builder to skip rebuilds when the mermaid code doesn't change.
 */
async function mermaidToSvg (graphId: string, graphCode: string, { cachePath }: Deck): Promise<string> {
  const graphCodeHash = await hashString(graphCode);
  const inputFilePath = resolve(cachePath, `${graphId}.mermaid`);
  const outputFilePath = resolve(cachePath, `${graphId}_${graphCodeHash}.svg`);

  if (!existsSync(outputFilePath)) {
    writeTextFileSync(inputFilePath, graphCode);
    try {
      const renderedSvg: string = await MERMAID_PROCESSOR.render(graphCode, `graph-${graphId}`);
      writeTextFileSync(outputFilePath, renderedSvg);
    } catch (error) {
      logError(_`Failed processing graph ${graphId}: ${(error as Error).message}`({ nodes: [ theme.strong, theme.error ] }));
      return writeErrorGraph(cachePath);
    }

    const dom: Dom = readTextFileSyncAndConvert(outputFilePath, (svg: string) => toDom(svg));
    const graphNode = dom.select('svg') as Element;
    addDiagramTweaks(graphNode, graphId, dom);
    writeTextFileSync(outputFilePath, graphNode.outerHTML);
  }

  return readTextFileSync(outputFilePath);
}

async function writeErrorGraph (cachePath: FileSystemPath): Promise<string> {
  const outputFilePath = resolve(cachePath, 'error.svg');

  if (existsSync(outputFilePath)) {
    return readTextFileSync(outputFilePath);
  }

  const errorGraph = await MERMAID_PROCESSOR.render('error', 'mermaid-error');
  writeTextFileSync(outputFilePath, errorGraph);
  return readTextFileSync(outputFilePath);
}

function addDiagramTweaks (graphNode: Element, graphId: string, dom: Dom): void {
  const graphType = graphNode.getAttribute('aria-roledescription');
  if (graphType) {
    graphNode.classList.add(graphType);
  } else {
    logError(_`No graph type for graph ${graphId}`({ nodes: [ theme.strong ] }));
  }

  removeFromParent(graphNode.querySelector('style') as Element); // Style added globally to avoid duplication

  dom.selectAll('marker > path') // Colors arrow heads like their tails
    .forEach((markerPath) => markerPath.setAttribute('fill', 'context-stroke'));

  dom.selectAll('svg[data-inject]') // FIXME : SVG injection should not work anymore (htmlLabels false).
    .forEach((node) => node.innerHTML = `<use href="#${node.getAttribute('data-inject')}"/>`);

  switch (graphType) {
    case 'flowchart-v2':
      return graphNode.querySelector('g>g.root')
        ?.classList
        ?.add('top-level'); // Mark top-level root for easier access!
    default:
      return;
  }
}

function animateNodes (graphId: string, graphNode: Element, animation: GraphAnimation) {
  const { selector, classes = [], attributes = {} } = animation;
  const elementsToAnimate = Array.from(graphNode.querySelectorAll(selector));
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
