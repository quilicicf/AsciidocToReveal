#!/usr/bin/env node

import { Parcel } from '@parcel/core';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';
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
const PRISM_LINE_NUMBERS__CSS_PATH = resolve(NODE_MODULES_PATH, 'prismjs', 'plugins', 'line-numbers', 'prism-line-numbers.css');

const BUILT_DECK_JS_FILE_PATH = resolve(BUILD_AREA_PATH, 'deck.js');
const BUILT_DECK_CSS_FILE_PATH = resolve(BUILD_AREA_PATH, 'deck.css');
const OUTPUT_FILE_PATH = resolve(DIST_FOLDER_PATH, 'deck.html');

const PRISM_CONFIGURATION = {
  blockTextElements: {
    script: true,
    noscript: true,
    style: true,
    // pre: true,
    code: true,
  },
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

  const processor = new Processor();
  RevealJsPlugin.register();

  const input = readFileSync(inputPath, 'utf8');
  const inputHtml = processor.convert(input, { standalone: true, backend: 'revealjs' });
  const baseAst = parse(inputHtml, PRISM_CONFIGURATION);
  const cleanAst = removeAllImports(baseAst);

  console.log('Bundling input deck file');
  await new Parcel(PARCEL_CONFIGURATION).run();

  const languages = findLanguages(cleanAst);
  const preparedAst = languages.length
    ? await highlightCode(cleanAst, languages)
    : cleanAst;

  const style = readFileSync(BUILT_DECK_CSS_FILE_PATH, 'utf8');
  const script = readFileSync(BUILT_DECK_JS_FILE_PATH, 'utf8')
    .replaceAll('<script>', '<"+"script>')
    .replaceAll('</script>', '</"+"script>');

  const finalAst = addStyleAndScript(preparedAst, style, script);
  writeFileSync(OUTPUT_FILE_PATH, finalAst.toString(), 'utf8');
}

function removeAllImports (ast) {
  const headNode = ast.querySelector('head');
  [ ...headNode.querySelectorAll('link[rel=stylesheet]') ]
    .forEach((styleSheetNode) => headNode.removeChild(styleSheetNode));
  [ ...headNode.querySelectorAll('style') ]
    .forEach((styleNode) => headNode.removeChild(styleNode));

  const bodyNode = ast.querySelector('body');
  [ ...bodyNode.querySelectorAll('script') ]
    .forEach((scriptNode) => bodyNode.removeChild(scriptNode));

  return ast;
}

function findLanguages (ast) {
  return [ ...ast.querySelectorAll('pre code[data-lang]') ]
    .map((codeNode) => codeNode.getAttribute('data-lang'))
    .sort();
}

async function highlightCode (ast, languages) {
  console.info(`Loading languages: [ ${languages.join(', ')} ]`);
  loadLanguages(languages);
  const preparedAst = prepareHighlighting(ast);

  // preparedAst.addEventListener = () => {};
  // global.window = preparedAst;
  // global.document = preparedAst;
  // await import('prismjs/plugins/line-numbers/prism-line-numbers.js');

  Prism.highlightAllUnder(preparedAst); // NOTE: MUTATES AST!
  return preparedAst;
}

function prepareHighlighting (ast) {
  [ ...ast.querySelectorAll('*') ] // Required for normalize white space
    .forEach((element) => {
  //     element.nodeName = element.rawTagName;
  //     element.parentElement = element.parentNode;
      element.className = [ ...element.classList.values() ].join(' ') || '';
    });

  const prismCss = readFileSync(PRISM_CSS_PATH);
  const headNode = ast.querySelector('head');
  headNode.insertAdjacentHTML('beforeend', `<style id="CSS_PRISM">${prismCss}</style>`);

  return ast;
}

function addStyleAndScript (ast, style, script) {
  const head = ast.querySelector('head');
  head.insertAdjacentHTML('beforeend', `\n<style id="CSS_REVEAL">${style}</style>\n`);

  const body = ast.querySelector('body');
  body.insertAdjacentHTML('beforeend', `\n<script id="JS_REVEAL" type="module">\n${script};\n</script>\n`);

  return ast;
}

function getModuleFolder (importMeta) {
  return resolve(dirname(fileURLToPath(importMeta.url)));
}

main()
  .catch((error) => {
    process.stderr.write(`Failed with error: ${error.stack}\n`);
    process.exit(1);
  });
