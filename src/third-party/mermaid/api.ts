import puppeteer, { Browser, LaunchOptions } from 'npm:puppeteer';
import { Mermaid, MermaidConfig } from 'npm:mermaid';

import { FileSystemPath, join, pathToFileUrl, resolve } from '../file-system/api.ts';

export interface MermaidCliConfig {
  backgroundColor: string;
  mermaidConfig: MermaidConfig;
}

export interface MermaidProcessor {
  close: () => Promise<void>;
  render: (mermaidText: string, inputSvgId: string, config?: MermaidCliConfig) => Promise<string>;
}

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

export async function createMermaidProcessor () {
  if (!BROWSER) {
    BROWSER = await puppeteer.launch(PUPPETEER_CONFIGURATION);
  }

  return {
    async close () {
      await BROWSER.close();
    },

    /**
     * Re-implementation of mermaid-cli to support a2r features.
     */
    async render (mermaidText: string, svgId: string, config: MermaidCliConfig = MERMAID_CLI_CONFIGURATION): Promise<string> {
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

        return page.$eval('svg', (svg) => {
          // SVG might have HTML <foreignObject> that are not valid XML
          // E.g. <br> must be replaced with <br/>
          // Luckily the DOM Web API has the XMLSerializer for this
          // eslint-disable-next-line no-undef
          const xmlSerializer = new XMLSerializer();
          return xmlSerializer.serializeToString(svg);
        });
      } finally {
        // await page.close(); FIXME : close pages without closing the browser
      }
    },
  };
}
