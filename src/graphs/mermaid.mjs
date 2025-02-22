import { resolve, join } from '../third-party/path/api.mjs';
import { pathToFileUrl } from '../third-party/path/api.mjs';
import puppeteer from 'puppeteer';
import { removeFromParent } from '../third-party/dom/api.mjs';

/** @type {import('puppeteer').LaunchOptions} */
const PUPPETEER_CONFIGURATION = {
  headless: true,
};

/** @type {import('@mermaid-js/mermaid-cli').ParseMDDOptions} */
const MERMAID_CLI_CONFIGURATION = {
  backgroundColor: 'transparent',
  myCSS: undefined, // Unused, style set globally to avoid duplication
  svgId: 'my-svg',
  // iconPacks: [], FIXME : add icon packs once this is delivered : https://github.com/mermaid-js/mermaid-cli/commit/7bd7eb2055a5ff6db30d8b8cc698d2698cc705d8
  mermaidConfig: {
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
  },
};

const MERMAID_IIFE_PATH = resolve(import.meta.dirname, '..', '..', 'node_modules', 'mermaid', 'dist', 'mermaid.esm.min.mjs');

/** @type {Browser} */
let BROWSER;

/**
 * @returns {Promise<A2R.MermaidProcessor>}
 */
export async function createMermaidProcessor() {
  if (!BROWSER) {
    BROWSER = await puppeteer.launch(PUPPETEER_CONFIGURATION);
  }

  /** @type {A2R.MermaidProcessor} */
  return {
    async close(){
      await BROWSER.close();
    },

    /**
     * Re-implementation of mermaid-cli to support a2r features.
     * @param mermaidText {string}
     * @param inputSvgId {string}
     * @return {Promise<string>}
     */
    async render (mermaidText, inputSvgId) {
      const mermaidCliConfiguration = { svgId: inputSvgId, ...MERMAID_CLI_CONFIGURATION };

      const {
        backgroundColor = 'white',
        mermaidConfig = {},
        myCSS,
        pdfFit,
        svgId,
      } = mermaidCliConfiguration;

      const page = await BROWSER.newPage();

      page.on('console', (msg) => {
        console.warn(msg.text());
      });

      try {
        const mermaidHTMLPath = join(import.meta.dirname, 'index.html');
        await page.goto(pathToFileUrl(mermaidHTMLPath).href);
        await page.$eval('body', (body, backgroundColor) => {
          body.style.background = backgroundColor;
        }, backgroundColor);
        await Promise.all([ page.addScriptTag({ path: MERMAID_IIFE_PATH }) ]);
        await page.$eval('#container', async (container, definition, mermaidConfig, myCSS, backgroundColor, svgId) => {
          await Promise.all(Array.from(document.fonts, (font) => font.load()));

          /**
           * @typedef {Object} GlobalThisWithMermaid
           * We've already imported mermaid by running `page.addScriptTag`
           * @property {import('mermaid')['default']} mermaid Already imported mermaid instance
           */
          const { mermaid } = /** @type {GlobalThisWithMermaid} */ (globalThis);

          mermaid.initialize({ startOnLoad: false, ...mermaidConfig });
          // should throw an error if mmd diagram is invalid
          const { svg: svgText } = await mermaid.render(svgId, mermaidText, container);
          container.innerHTML = svgText;

          const svg = container.getElementsByTagName?.('svg')?.[ 0 ];
          if (svg?.style) {
            svg.style.backgroundColor = backgroundColor;
          } else {
            console.warn('svg not found. Not applying background color.');
          }
          removeFromParent(svg, 'style'); // Style added globally to avoid duplication
        }, mermaidText, mermaidConfig, myCSS, backgroundColor, svgId);

        return page.$eval('svg', (svg) => {
          // SVG might have HTML <foreignObject> that are not valid XML
          // E.g. <br> must be replaced with <br/>
          // Luckily the DOM Web API has the XMLSerializer for this
          // eslint-disable-next-line no-undef
          const xmlSerializer = new XMLSerializer();
          return xmlSerializer.serializeToString(svg);
        });
      } finally {
        await page.close();
      }
    }
  }
}
