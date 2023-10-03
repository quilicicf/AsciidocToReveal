import loadLanguages from 'prismjs/components/index.js';
import Prism from 'prismjs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { stoyle } from 'stoyle';

import { $, $$ } from '../domUtils.mjs';
import { NODE_MODULES_PATH } from '../folders.mjs';
import { logInfo } from '../log.mjs';
import theme from '../theme.mjs';

const PRISM_CSS_PATH = resolve(NODE_MODULES_PATH, 'prismjs', 'themes', 'prism-tomorrow.css');

const PRISM_PLUGINS = {
  'line-numbers': {
    cssPath: resolve(NODE_MODULES_PATH, 'prismjs', 'plugins', 'line-numbers', 'prism-line-numbers.css'),
    additionalCss: `pre.highlight.line-numbers code { overflow: unset; }`,
    pluginPath: 'prismjs/plugins/line-numbers/prism-line-numbers.js',
  },
  'keep-markup': {
    cssPath: undefined,
    additionalCss: '',
    pluginPath: 'prismjs/plugins/keep-markup/prism-keep-markup.js',
  },
};

export async function highlightCode (dom) {
  const languages = [
    ...new Set(
      $$(dom, 'pre code[data-lang]')
        .map((codeNode) => codeNode.getAttribute('data-lang'))
        .sort(),
    ),
  ];

  if (!languages.length) { return dom; }

  logInfo(stoyle`Highlighting languages: [ ${languages.join(', ')} ]`({ nodes: [ theme.strong ] }));
  loadLanguages(languages);

  const pluginsToActivate = Object.entries(PRISM_PLUGINS)
    .filter(([ key ]) => $$(dom, `.${key}`).length)
    .map(([ , plugin ]) => plugin);

  const preparedDom = await prepareHighlighting(dom, pluginsToActivate);
  Prism.highlightAllUnder(preparedDom.window.document); // NOTE: MUTATES AST!
  return preparedDom;
}

async function prepareHighlighting (dom, pluginsToActivate) {
  global.window = dom.window; // NOTE: required for Prism plugins, emulates a browser environment
  global.document = dom.window.document; // NOTE: required for Prism plugins, emulates a browser environment
  global.getComputedStyle = window.getComputedStyle; // Line-numbers plugin uses it as if in a browser => window instead of global

  const pluginsCss = await pluginsToActivate
    .reduce(
      (promise, plugin) => promise.then(async (seed) => {
        await import(plugin.pluginPath);
        const pluginCss = plugin.cssPath ? readFileSync(plugin.cssPath, 'utf8') : '';
        return `${seed}${pluginCss}${plugin.additionalCss}`;
      }),
      Promise.resolve(''),
    );

  const prismCss = readFileSync(PRISM_CSS_PATH);
  const headNode = $(dom, 'head');
  headNode.insertAdjacentHTML('beforeend', `<style id="CSS_PRISM">${prismCss}${pluginsCss}</style>`);
  return dom;
}
