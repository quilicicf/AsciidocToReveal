#!/usr/bin/env node

import { Parcel } from '@parcel/core';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import loadLanguages from 'prismjs/components/index.js';
import Prism from 'prismjs';
import minifyHtml from '@minify-html/node';

import { asciidocToHtml } from './src/asciidocToHtml.mjs';
import { $, $$ } from './src/domUtils.mjs';

// Folders
const REPOSITORY_ROOT_PATH = getModuleFolder(import.meta);
const DECK_JS_FILE_PATH = resolve(REPOSITORY_ROOT_PATH, 'src', 'deck.mjs');
const BUILD_AREA_PATH = resolve(REPOSITORY_ROOT_PATH, 'build-area');
const DIST_FOLDER_PATH = resolve(REPOSITORY_ROOT_PATH, 'dist');
const NODE_MODULES_PATH = resolve(REPOSITORY_ROOT_PATH, 'node_modules');
const PRISM_CSS_PATH = resolve(NODE_MODULES_PATH, 'prismjs', 'themes', 'prism-tomorrow.css');
// const PRISM_LINE_NUMBERS__CSS_PATH = resolve(NODE_MODULES_PATH, 'prismjs', 'plugins', 'line-numbers', 'prism-line-numbers.css');

const BUILT_DECK_JS_FILE_PATH = resolve(BUILD_AREA_PATH, 'deck.js');
const BUILT_DECK_CSS_FILE_PATH = resolve(BUILD_AREA_PATH, 'deck.css');
const OUTPUT_FILE_PATH = resolve(DIST_FOLDER_PATH, 'deck.html');

const MINIFIER_CONFIGURATION = {
  keep_spaces_between_attributes: false,
  keep_comments: false,
  minify_js: true,
  minify_css: true,
};
const PARCEL_CONFIGURATION = {
  entries: [ DECK_JS_FILE_PATH ],
  mode: 'production',
  defaultConfig: '@parcel/config-default',
  shouldContentHash: false,
  defaultTargetOptions: {
    sourceMaps: false,
    distDir: BUILD_AREA_PATH,
    engines: {
      browsers: [ 'last 1 Firefox version' ],
    },
  },
  additionalReporters: [
    {
      packageName: '@parcel/reporter-cli',
      resolveFrom: REPOSITORY_ROOT_PATH,
    },
  ],
};

async function main () {
  const [ , , inputPath ] = process.argv;

  if (!existsSync(BUILT_DECK_JS_FILE_PATH) || !existsSync(BUILT_DECK_CSS_FILE_PATH)) {
    // TODO: Rethink this.
    //       * Either the version of Reveal is fixed and these files can be pre-compiled
    //       * Or it should depend on the child project and the resolution of Node packages must evolve
    console.log('Bundling input deck file');
    await new Parcel(PARCEL_CONFIGURATION).run();
  }

  const baseDom = asciidocToHtml(inputPath);
  const finalDom = await [
    highlightCode,
    addStyleAndScript,
  ].reduce((promise, operation) => promise.then(async (seed) => operation(seed)), Promise.resolve(baseDom));

  const unMinified = finalDom.serialize();
  const minified = minifyHtml.minify(
    Buffer.from(unMinified),
    MINIFIER_CONFIGURATION,
  ).toString('utf8');
  writeFileSync(OUTPUT_FILE_PATH, minified, 'utf8');
}

async function highlightCode (dom) {
  const languages = $$(dom, 'pre code[data-lang]')
    .map((codeNode) => codeNode.getAttribute('data-lang'))
    .sort();

  if (!languages.length) { return dom; }

  console.info(`Loading languages: [ ${languages.join(', ')} ]`);
  loadLanguages(languages);
  const preparedDom = prepareHighlighting(dom);

  // global.window = dom.window; // NOTE: required for Prism plugins, emulates a browser environment
  // global.document = dom.window.document; // NOTE: required for Prism plugins, emulates a browser environment
  // global.getComputedStyle = window.getComputedStyle; // Line-numbers plugin uses it as if in a browser => window instead of global
  // await import('prismjs/plugins/line-numbers/prism-line-numbers.js'); // FIXME: for some reason, the line number don't show up
  // await import('prismjs/plugins/keep-markup/prism-keep-markup.js'); // FIXME: needs manual Asciidoctor parsing, or it escapes markup in code blocks

  Prism.highlightAllUnder(preparedDom.window.document); // NOTE: MUTATES AST!
  return preparedDom;
}

function prepareHighlighting (dom) {
  // $$(dom, 'code')
  //   .forEach((element) => element.children.length = element?.childNodes?.length); // FIXME: Keep markup plugin expects that

  const prismCss = readFileSync(PRISM_CSS_PATH);
  // const lineNumbersCss = readFileSync(PRISM_LINE_NUMBERS__CSS_PATH); // FIXME: re-add and make optional depending on whether it's used
  const headNode = $(dom, 'head');
  headNode.insertAdjacentHTML('beforeend', `<style id="CSS_PRISM">${prismCss}</style>`);
  return dom;
}

function addStyleAndScript (dom) {
  const style = readFileSync(BUILT_DECK_CSS_FILE_PATH, 'utf8');
  const head = $(dom, 'head');
  head.insertAdjacentHTML('beforeend', `\n<style id="CSS_REVEAL">${style}</style>\n`);

  const script = readFileSync(BUILT_DECK_JS_FILE_PATH, 'utf8')
    .replaceAll('<script>', '<"+"script>')
    .replaceAll('</script>', '</"+"script>');
  const body = $(dom, 'body');
  body.insertAdjacentHTML('beforeend', `\n<script id="JS_REVEAL" type="module">\n${script};\n</script>\n`);

  return dom;
}

function getModuleFolder (importMeta) {
  return resolve(dirname(fileURLToPath(importMeta.url)));
}

main()
  .catch((error) => {
    process.stderr.write(`Failed with error: ${error.stack}\n`);
    process.exit(1);
  });
