import puppeteer, { Browser, LaunchOptions } from 'npm:puppeteer';
import { Mermaid, MermaidConfig } from 'npm:mermaid';

import { FileSystemPath, join, pathToFileUrl, readDirSync, readTextFileSync, resolve } from '../file-system/api.ts';
import {
  DomId,
  DarkStyle,
  GraphInputText, GraphOutputText,
  GraphProcessor,
  GraphStyles, GraphType,
  LightStyle,
  ProcessedGraph,
} from '../../domain/api.ts';
import { _, logError, theme } from '../logger/log.ts';
import { DIAGRAM_STYLES_FOLDER } from '../../paths.ts';

export interface MermaidCliConfig {
  backgroundColor: string;
  mermaidConfig: MermaidConfig;
}

export interface MermaidProcessor {
  close: () => Promise<void>;
  render: (mermaidText: string, inputSvgId: string, config?: MermaidCliConfig) => Promise<string>;
}

const GRAPH_TYPES: GraphType[] = readDirSync(DIAGRAM_STYLES_FOLDER)
  .filter((styleFileName) => styleFileName.endsWith('_dark.css'))
  .map((styleFileName) => styleFileName.replace(/_dark.css$/, '') as GraphType);

const PUPPETEER_CONFIGURATION: LaunchOptions = {
  headless: true,
};

const MERMAID_CONFIG: MermaidConfig = {
  theme: 'default',
  logLevel: 'error',
  securityLevel: 'loose',
  startOnLoad: false,
  deterministicIds: true,
  htmlLabels: false,
  flowchart: {
    useMaxWidth: false,
    htmlLabels: false,
  },
};

const MERMAID_CLI_CONFIGURATION: MermaidCliConfig = {
  backgroundColor: 'transparent',
  // iconPacks: [], FIXME : add icon packs once this is delivered : https://github.com/mermaid-js/mermaid-cli/commit/7bd7eb2055a5ff6db30d8b8cc698d2698cc705d8
  mermaidConfig: MERMAID_CONFIG,
};

const MERMAID_IIFE_PATH = resolve(
  (import.meta.dirname || '') as FileSystemPath,
  '..', '..', '..', 'node_modules', 'mermaid', 'dist', 'mermaid.min.js',
);

let BROWSER: Browser;

export async function createMermaidProcessor (): Promise<GraphProcessor> {
  if (!BROWSER) {
    BROWSER = await puppeteer.launch(PUPPETEER_CONFIGURATION);
  }

  return {
    async close () {
      await BROWSER.close();
    },
    render,
    getStyles,
  };
}

/**
 * Re-implementation of mermaid-cli to support a2r features.
 */
async function render (mermaidText: GraphInputText, svgId: DomId, config: MermaidCliConfig = MERMAID_CLI_CONFIGURATION): Promise<ProcessedGraph> {

  const {
    backgroundColor = 'white',
    mermaidConfig = {},
  } = config;

  const page = await BROWSER.newPage();

  page.on('console', (msg) => {
    console.warn(msg.text());
  });

  try {
    const mermaidHTMLPath = join((import.meta.dirname || '') as FileSystemPath, 'index.html');
    await page.goto(pathToFileUrl(mermaidHTMLPath).href);
    await page.$eval('body', (body, backgroundColor) => {
      body.style.background = backgroundColor;
    }, backgroundColor);
    await page.addScriptTag({ path: MERMAID_IIFE_PATH }); // Import by path because mermaid is multi-file
    await page.$eval('#container', async (container, mermaidText, mermaidConfig, svgId) => {
      const { mermaid } = globalThis as unknown as { mermaid: Mermaid };
      mermaid.initialize({ startOnLoad: false, ...mermaidConfig });
      // should throw an error if mmd diagram is invalid
      const { svg: svgText } = await mermaid.render(svgId, mermaidText, container);
      container.innerHTML = svgText;
    }, mermaidText, mermaidConfig, svgId);

    const graphType = await page.$eval('svg', (svg) => {
      return svg.getAttribute('aria-roledescription') || 'graph-type-not-found';
    });

    const graphContent = await page.$eval('svg', (svg, svgId) => {
      function addDiagramTweaks (graphNode: Element): void {
        const graphType = graphNode.getAttribute('aria-roledescription');
        if (graphType) {
          graphNode.classList.add(graphType);
        } else {
          logError(_`No graph type for graph ${svgId}`({ nodes: [ theme.strong ] }));
        }

        const styleNode = graphNode.querySelector('style') as Element;
        styleNode.parentNode?.removeChild(styleNode); // Style added globally to avoid duplication

        graphNode.querySelectorAll('marker > path') // Colors arrow heads like their tails
          .forEach((markerPath) => markerPath.setAttribute('fill', 'context-stroke'));

        switch (graphType) {
          case 'flowchart-v2':
            return graphNode.querySelector('g>g.root')
              ?.classList
              ?.add('top-level'); // Mark top-level root for easier access!
          default:
            return;
        }
      }

      addDiagramTweaks(svg);

      // SVG might have HTML <foreignObject> that are not valid XML
      // E.g. <br> must be replaced with <br/>
      // Luckily the DOM Web API has the XMLSerializer for this
      // eslint-disable-next-line no-undef
      const xmlSerializer = new XMLSerializer();
      return xmlSerializer.serializeToString(svg);
    }, svgId);

    return {
      id: svgId,
      type: graphType as GraphType,
      content: graphContent as GraphOutputText,
    };
  } finally {
    // await page.close(); FIXME : close pages without closing the browser
  }
}

function getStyles (graphTypes: GraphType[]): GraphStyles[] {
  return graphTypes
    .filter((graphType) => GRAPH_TYPES.includes(graphType))
    .map((graphType) => {
        const darkStyleFilePath = resolve(DIAGRAM_STYLES_FOLDER, `${graphType}_dark.css`);
        const darkStyle = readTextFileSync(darkStyleFilePath) as DarkStyle;
        const lightStyleFilePath = resolve(DIAGRAM_STYLES_FOLDER, `${graphType}_light.css`);
        const lightStyle = readTextFileSync(lightStyleFilePath) as LightStyle;

        return {
          styleIdPrefix: graphType
            .toUpperCase()
            .replace(/-/g, '_') as DomId,
          lightStyle,
          darkStyle,
        };
      },
    );
}
