#!/usr/bin/env node

import { Parcel } from '@parcel/core';
import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import minifyHtml from '@minify-html/node';

import { asciidocToHtml } from './asciidoc-to-html/index.mjs';
import { $ } from './domUtils.mjs';
import { highlightCode } from './highlightCode.mjs';
import { BUILD_AREA_PATH, DIST_FOLDER_PATH, LIB_FOLDER, REPOSITORY_ROOT_PATH } from './folders.mjs';
import { buildGraphs } from './graphs/build-graphs.mjs';

const DECK_JS_FILE_PATH = resolve(LIB_FOLDER, 'deck.mjs');
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

export async function asciidocToReveal (inputPath) {
  if (!existsSync(BUILT_DECK_JS_FILE_PATH) || !existsSync(BUILT_DECK_CSS_FILE_PATH)) {
    // TODO: Rethink this.
    //       * Either the version of Reveal is fixed and these files can be pre-compiled
    //       * Or it should depend on the child project and the resolution of Node packages must evolve
    console.log('Bundling input deck file');
    await new Parcel(PARCEL_CONFIGURATION).run();
  }

  const baseDom = asciidocToHtml(inputPath);
  const finalDom = await [
    buildGraphs,
    highlightCode,
    addRevealJs,
  ].reduce((promise, operation) => promise.then(async (seed) => operation(seed)), Promise.resolve(baseDom));

  const unMinified = finalDom.serialize();
  const minified = minifyHtml.minify(
    Buffer.from(unMinified),
    MINIFIER_CONFIGURATION,
  ).toString('utf8');
  writeFileSync(OUTPUT_FILE_PATH, minified, 'utf8');
}

function addRevealJs (dom) {
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
