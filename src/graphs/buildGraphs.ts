import { hashString } from '../third-party/crypto/api.ts';
import { existsSync, readTextFileSync, resolve, writeTextFileSync } from '../third-party/file-system/api.ts';
import { _, logError, logInfo, theme } from '../third-party/logger/log.ts';
import { createMermaidProcessor } from '../third-party/mermaid/api.ts';
import {
  DomId,
  Deck,
  Dom,
  GraphOutputText,
  GraphProcessor,
  GraphType,
  ProcessedGraph, GraphInputText,
} from '../domain/api.ts';
import { insertThemedStyles } from '../themes/applyTheme.ts';
import { entries } from '../utils.ts';

const GRAPH_PROCESSOR_PROMISE: Promise<GraphProcessor> = createMermaidProcessor();

export default async function buildGraphs (dom: Dom, deck: Deck): Promise<Dom> {
  const { graphsRegister, graphAnimationsRegister } = deck;
  const graphEntries = entries(graphsRegister);
  if (!graphEntries.length) { return dom; }

  const graphProcessor = await GRAPH_PROCESSOR_PROMISE;
  const processedGraphs: ProcessedGraph[] = await Promise.all(
    graphEntries
      .map(([ graphId, graphInputText ]) => processGraph(graphProcessor, graphId, graphInputText, deck)),
  );

  const graphTypes: GraphType[] = [
    ...new Set(processedGraphs.map(({ type }) => type)),
  ];

  if (graphTypes.length) {
    logInfo(_`Applying themes for graph types: [ ${graphTypes.join(', ')} ]`({ nodes: [ theme.strong ] }));
    graphProcessor
      .getStyles(graphTypes)
      .forEach((graphStyles) => insertThemedStyles(dom, graphStyles.styleIdPrefix, graphStyles.lightStyle, graphStyles.darkStyle, deck));
  }

  processedGraphs
    .forEach(({ id, content }) => {
      const svgNode = dom.select(`#${id}`) as Element;
      svgNode.innerHTML = content;
    });

  // const animationsWithNoGraph = Object.keys(graphAnimationsRegister)
  //   .filter((graphAnimationId) => !graphsRegister[ graphAnimationId ]);
  // if (animationsWithNoGraph.length) {
  //   logWarn(_`Graph animations [ ${animationsWithNoGraph.join(', ')} ] are linked to no known graph`({ nodes: [ theme.strong ] }));
  // }

  if (!deck.buildOptions.shouldAddLiveReload) {
    await graphProcessor.close(); // Close when building, keep open when watching
  }
  return dom;
}

/**
 * Builds an SVG definition for a given Mermaid graph.
 * SVG files are built in the build-area and IDed with a hash of the mermaid code.
 * This pollutes the build area a bit, but allows the builder to skip rebuilds when the mermaid code doesn't change.
 */
async function processGraph (graphProcessor: GraphProcessor, graphId: DomId, graphInputText: GraphInputText, { cachePath }: Deck): Promise<ProcessedGraph> {
  const graphCodeHash = await hashString(graphInputText);
  const cacheFilePath = resolve(cachePath, `${graphId}_${graphCodeHash}.json`);

  if (existsSync(cacheFilePath)) { // Cache hit
    return JSON.parse(readTextFileSync(cacheFilePath));

  } else { // Cache miss
    try {
      const processedGraph = await graphProcessor.render(graphInputText, `graph-${graphId}` as DomId);
      writeTextFileSync(cacheFilePath, JSON.stringify(processedGraph));
      return processedGraph;
    } catch (error) {
      logError(_`Failed processing graph ${graphId}: ${(error as Error).message}`({ nodes: [ theme.strong, theme.error ] }));
      return {
        id: graphId,
        type: 'error' as GraphType,
        content: `<span>Error processing graph ${graphId}</span>` as GraphOutputText,
      };
    }
  }
}

// function animateNodes (graphId: string, graphNode: Element, animation: GraphAnimation) {
//   const { selector, classes = [], attributes = {} } = animation;
//   const elementsToAnimate = Array.from(graphNode.querySelectorAll(selector));
//   if (!elementsToAnimate.length) {
//     logWarn(_`Could not animate elements defined by ${selector} in graph ${graphId}, not found.`({ nodes: [ theme.strong, theme.strong ] }));
//     return;
//   }
//
//   const defaultClassesToAdd = [ 'fragment', 'fade-in' ];
//   elementsToAnimate.forEach((elementToAnimate) => {
//     const classesToAdd = classes.length ? classes : defaultClassesToAdd;
//     elementToAnimate.classList.add(...classesToAdd);
//     Object.entries(attributes)
//       .forEach(([ key, value ]) => elementToAnimate.setAttribute(key, value));
//   });
// }
