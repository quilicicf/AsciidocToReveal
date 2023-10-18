import deckToHtml from './asciidoc/deckToHtml.mjs';
import parseDeck from './asciidoc/parseDeck.mjs';
import highlightCode from './code/highlightCode.mjs';
import insertCustomFiles from './custom-files/insertCustomFiles.mjs';
import { DIST_FOLDER_PATH, LIB_FOLDER, REPOSITORY_ROOT_PATH } from './folders.mjs';
import buildGraphs from './graphs/buildGraphs.mjs';
import applyLayouts from './layouts/applyLayouts.mjs';
import applyTheme from './themes/applyTheme.mjs';
import { bundle } from './third-party/bundler/api.mjs';
import { INSERT_POSITIONS } from './third-party/dom/api.mjs';
import { existsSync, readTextFileSync, writeTextFileSync } from './third-party/fs/api.mjs';
import { logInfo } from './third-party/logger/api.mjs';
import { minify } from './third-party/minifier/api.mjs';
import { resolve } from './third-party/path/api.mjs';

const DECK_JS_FILE_PATH = resolve(LIB_FOLDER, 'deck.mjs');
const OUTPUT_FILE_PATH = resolve(DIST_FOLDER_PATH, 'deck.html');

export async function asciidocToReveal (inputPath, outputPath = OUTPUT_FILE_PATH, buildOptions = {}) {
  const deck = await parseDeck(inputPath, buildOptions);
  if (!existsSync(deck.builtDeckJsFilePath) || !existsSync(deck.builtDeckCssFilePath)) {
    // TODO: Rethink this.
    //       * Either the version of Reveal is fixed and these files can be pre-compiled
    //       * Or it should depend on the child project and the resolution of Node packages must evolve
    logInfo('Bundling input deck file');
    await bundle(DECK_JS_FILE_PATH, deck.cachePath, REPOSITORY_ROOT_PATH);
  }

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

  const unMinified = finalDom.toHtml();
  const minified = minify(unMinified);
  writeTextFileSync(outputPath, minified);

  return deck;
}

function insertLiveReloadScript (dom, { inputHash, buildOptions }) {
  if (!buildOptions.shouldAddLiveReload) { return dom; }

  const liveReloadScriptPath = resolve(LIB_FOLDER, 'liveReload.mjs');
  const liveReloadScript = readTextFileSync(
    liveReloadScriptPath,
    (template) => template.replace('$$HASH$$', inputHash),
  );

  dom.insertInlineScript('LIVE_RELOAD', liveReloadScript);

  return dom;
}

function addRevealJs (dom, { builtDeckJsFilePath, builtDeckCssFilePath }) {
  const style = readTextFileSync(builtDeckCssFilePath);
  dom.insertInlineStyle('REVEAL', style, INSERT_POSITIONS.AFTER_BEGIN);

  const script = readTextFileSync(builtDeckJsFilePath)
    .replaceAll('<script>', '<"+"script>')
    .replaceAll('</script>', '</"+"script>');
  dom.insertInlineScript('REVEAL', script, INSERT_POSITIONS.AFTER_BEGIN);

  return dom;
}
