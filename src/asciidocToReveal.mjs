import minifyHtml from '@minify-html/node';
import { Parcel } from '@parcel/core';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import deckToHtml from './asciidoc/deckToHtml.mjs';
import parseDeck from './asciidoc/parseDeck.mjs';
import highlightCode from './code/highlightCode.mjs';
import insertCustomFiles from './custom-files/insertCustomFiles.mjs';
import { insertInlineScript, insertInlineStyle } from './domUtils.mjs';
import { BUILD_AREA_PATH, DIST_FOLDER_PATH, LIB_FOLDER, REPOSITORY_ROOT_PATH } from './folders.mjs';
import buildGraphs from './graphs/buildGraphs.mjs';
import applyLayouts from './layouts/applyLayouts.mjs';
import { logInfo } from './log.mjs';

import applyTheme from './themes/applyTheme.mjs';

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
const PARCEL_JS_CONFIGURATION = {
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

export async function asciidocToReveal (inputPath, outputPath = OUTPUT_FILE_PATH, buildOptions = {}) {
  if (!existsSync(BUILT_DECK_JS_FILE_PATH) || !existsSync(BUILT_DECK_CSS_FILE_PATH)) {
    // TODO: Rethink this.
    //       * Either the version of Reveal is fixed and these files can be pre-compiled
    //       * Or it should depend on the child project and the resolution of Node packages must evolve
    logInfo('Bundling input deck file');
    await new Parcel(PARCEL_JS_CONFIGURATION).run();
  }

  const deck = parseDeck(inputPath, buildOptions);
  const baseDom = deckToHtml(deck);
  const finalDom = await [
    buildGraphs,
    highlightCode,
    applyLayouts,
    applyTheme,
    insertCustomFiles,
    insertLiveReloadScript,
    addRevealJs,
  ].reduce((promise, operation) => promise.then(async (dom) => operation(dom, deck)), Promise.resolve(baseDom));

  const unMinified = finalDom.serialize();
  const minified = minifyHtml.minify(
    Buffer.from(unMinified),
    MINIFIER_CONFIGURATION,
  ).toString('utf8');
  writeFileSync(outputPath, minified, 'utf8');
}

function insertLiveReloadScript (dom, { inputHash, buildOptions }) {
  if (!buildOptions.shouldAddLiveReload) { return dom; }

  const liveReloadScriptPath = resolve(LIB_FOLDER, 'liveReload.mjs');
  const liveReloadScriptTemplate = readFileSync(liveReloadScriptPath, 'utf8');
  const liveReloadScript = liveReloadScriptTemplate.replace('$$HASH$$', inputHash);

  insertInlineScript(dom, 'LIVE_RELOAD', liveReloadScript);

  return dom;
}

function addRevealJs (dom) {
  const style = readFileSync(BUILT_DECK_CSS_FILE_PATH, 'utf8');
  insertInlineStyle(dom, 'REVEAL', style, 'afterbegin');

  const script = readFileSync(BUILT_DECK_JS_FILE_PATH, 'utf8')
    .replaceAll('<script>', '<"+"script>')
    .replaceAll('</script>', '</"+"script>');
  insertInlineScript(dom, 'REVEAL', script, 'afterbegin');

  return dom;
}
