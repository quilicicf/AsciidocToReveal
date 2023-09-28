#!/usr/bin/env node

import { Parcel } from '@parcel/core';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import jsdom from 'jsdom';
import { readFileSync, writeFileSync } from 'fs';
import Processor from '@asciidoctor/core';
import RevealJsPlugin from '@asciidoctor/reveal.js';
import loadLanguages from 'prismjs/components/index.js';
import Prism from 'prismjs';

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

  const processor = new Processor();
  RevealJsPlugin.register();

  const input = readFileSync(inputPath, 'utf8');
  const inputHtml = processor.convert(input, { standalone: true, backend: 'revealjs' });
  const baseDom = new jsdom.JSDOM(inputHtml);
  const cleanDom = removeAllImports(baseDom);

  console.log('Bundling input deck file');
  await new Parcel(PARCEL_CONFIGURATION).run();

  const languages = findLanguages(cleanDom);
  const preparedDom = languages.length
    ? await highlightCode(cleanDom, languages)
    : cleanDom;

  const style = readFileSync(BUILT_DECK_CSS_FILE_PATH, 'utf8');
  const script = readFileSync(BUILT_DECK_JS_FILE_PATH, 'utf8')
    .replaceAll('<script>', '<"+"script>')
    .replaceAll('</script>', '</"+"script>');

  const finalDom = addStyleAndScript(preparedDom, style, script);
  writeFileSync(OUTPUT_FILE_PATH, finalDom.serialize(), 'utf8');
}

function removeAllImports (dom) {
  const headNode = query(dom, 'head');
  [ ...headNode.querySelectorAll('link[rel=stylesheet]') ]
    .forEach((styleSheetNode) => headNode.removeChild(styleSheetNode));
  [ ...headNode.querySelectorAll('style') ]
    .forEach((styleNode) => headNode.removeChild(styleNode));

  const bodyNode = query(dom, 'body');
  [ ...bodyNode.querySelectorAll('script') ]
    .forEach((scriptNode) => bodyNode.removeChild(scriptNode));

  return dom;
}

function findLanguages (dom) {
  return queryAll(dom, 'pre code[data-lang]')
    .map((codeNode) => codeNode.getAttribute('data-lang'))
    .sort();
}

async function highlightCode (dom, languages) {
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
  // queryAll(dom, 'code')
  //   .forEach((element) => element.children.length = element?.childNodes?.length); // FIXME: Keep markup plugin expects that

  const prismCss = readFileSync(PRISM_CSS_PATH);
  // const lineNumbersCss = readFileSync(PRISM_LINE_NUMBERS__CSS_PATH); // FIXME: re-add and make optional depending on whether it's used
  const headNode = query(dom, 'head');
  headNode.insertAdjacentHTML('beforeend', `<style id="CSS_PRISM">${prismCss}</style>`);
  return dom;
}

function addStyleAndScript (dom, style, script) {
  const head = query(dom, 'head');
  head.insertAdjacentHTML('beforeend', `\n<style id="CSS_REVEAL">${style}</style>\n`);

  const body = query(dom, 'body');
  body.insertAdjacentHTML('beforeend', `\n<script id="JS_REVEAL" type="module">\n${script};\n</script>\n`);

  return dom;
}

function query (dom, selector) {
  return dom.window.document.querySelector(selector);
}

function queryAll (dom, selector) {
  return [ ...dom.window.document.querySelectorAll(selector) ];
}

function getModuleFolder (importMeta) {
  return resolve(dirname(fileURLToPath(importMeta.url)));
}

main()
  .catch((error) => {
    process.stderr.write(`Failed with error: ${error.stack}\n`);
    process.exit(1);
  });
