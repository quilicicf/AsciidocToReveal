import puppeteer, { Browser, LaunchOptions } from 'npm:puppeteer';
import { Mermaid, MermaidConfig } from 'npm:mermaid';

import { FileSystemPath, join, pathToFileUrl, readDirSync, readTextFileSync, resolve } from '../file-system/api.ts';
import {
  DarkStyle,
  DomId,
  GraphInputText,
  GraphOutputText,
  GraphProcessor,
  GraphStyles,
  GraphType,
  LightStyle,
  ProcessedGraph, SvgIcon,
} from '../../domain/api.ts';
import { _, logError, theme } from '../logger/log.ts';
import { DIAGRAM_STYLES_FOLDER } from '../../paths.ts';
import { IconifyJSON, IconifyIcons } from 'npm:iconify-types';

export interface MermaidCliConfig {
  backgroundColor: string;
  mermaidConfig: MermaidConfig;
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
let INTERNAL_ICON_PACK: IconifyJSON;

export async function createMermaidProcessor (svgIcons: Record<string, SvgIcon>): Promise<GraphProcessor> {
  if (!BROWSER) {
    BROWSER = await puppeteer.launch(PUPPETEER_CONFIGURATION);
  }
  if (!INTERNAL_ICON_PACK) {
    INTERNAL_ICON_PACK = {
      prefix: 'deck',
      icons: Object.values(svgIcons)
        .reduce(
          (seed, svgIcon) => {
            seed[ svgIcon.id ] = {
              top: svgIcon.top,
              left: svgIcon.left,
              width: svgIcon.width,
              height: svgIcon.height,
              body: svgIcon.body,
            };
            return seed;
          },
          {} as IconifyIcons,
        ),
    };
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
async function render (mermaidText: GraphInputText, svgId: DomId, config?: MermaidCliConfig): Promise<ProcessedGraph> {

  const {
    backgroundColor = 'white',
    mermaidConfig = {},
  } = config || MERMAID_CLI_CONFIGURATION;

  const page = await BROWSER.newPage();

  page.on('console', (msg) => {
    console.warn(msg.text());
  });

  try {
    const shouldRemoveStyle = !config; // The style is removed when rendering the normal way (deck) but not when writing diagram styles
    const mermaidHTMLPath = join((import.meta.dirname || '') as FileSystemPath, 'index.html');
    await page.goto(pathToFileUrl(mermaidHTMLPath).href);
    await page.$eval('body', (body, backgroundColor) => {
      body.style.background = backgroundColor;
    }, backgroundColor);
    await page.addScriptTag({ path: MERMAID_IIFE_PATH }); // Import by path because mermaid is multi-file
    await page.$eval('#container', async (container, mermaidText, mermaidConfig, svgId, iconPack) => {
      const { mermaid } = globalThis as unknown as { mermaid: Mermaid };
      mermaid.initialize({ startOnLoad: false, ...mermaidConfig });
      mermaid.registerIconPacks([ { name: 'deck', icons: iconPack } ]);
      // should throw an error if mmd diagram is invalid
      const { svg: svgText } = await mermaid.render(svgId, mermaidText, container);
      container.innerHTML = svgText;
    }, mermaidText, mermaidConfig, svgId, INTERNAL_ICON_PACK);

    const graphType = await page.$eval('svg', (svg) => {
      return svg.getAttribute('aria-roledescription') || 'graph-type-not-found';
    });

    const graphContent = await page.$eval('svg', (svg, svgId, shouldRemoveStyle) => {
      function addDiagramTweaks (graphNode: Element): void {
        const graphType = graphNode.getAttribute('aria-roledescription');
        if (graphType) {
          graphNode.classList.add(graphType);
        } else {
          logError(_`No graph type for graph ${svgId}`({ nodes: [ theme.strong ] }));
        }

        const styleNode = graphNode.querySelector('style') as Element;
        if (shouldRemoveStyle) {
          styleNode.parentNode?.removeChild(styleNode); // Style added globally to avoid duplication
        }

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
    }, svgId, shouldRemoveStyle);

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
