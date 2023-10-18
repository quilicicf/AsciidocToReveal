import deckToHtml from './asciidoc/deckToHtml.mjs';
import parseDeck from './asciidoc/parseDeck.mjs';
import highlightCode from './code/highlightCode.mjs';
import insertCustomFiles from './custom-files/insertCustomFiles.mjs';
import { BUILD_AREA_PATH, DIST_FOLDER_PATH, LIB_FOLDER, REPOSITORY_ROOT_PATH } from './folders.mjs';
import buildGraphs from './graphs/buildGraphs.mjs';
import applyLayouts from './layouts/applyLayouts.mjs';
import { logInfo } from './log.mjs';
import applyTheme from './themes/applyTheme.mjs';
import { bundle } from './third-party/bundler/api.mjs';
import { INSERT_POSITIONS } from './third-party/dom/api.mjs';
import { existsSync, readTextFileSync, writeTextFileSync } from './third-party/fs/api.mjs';
import { minify } from './third-party/minifier/api.mjs';
import { resolve } from './third-party/path/api.mjs';

const DECK_JS_FILE_PATH = resolve(LIB_FOLDER, 'deck.mjs');
const BUILT_DECK_JS_FILE_PATH = resolve(BUILD_AREA_PATH, 'deck.js');
const BUILT_DECK_CSS_FILE_PATH = resolve(BUILD_AREA_PATH, 'deck.css');
const OUTPUT_FILE_PATH = resolve(DIST_FOLDER_PATH, 'deck.html');

export async function asciidocToReveal (inputPath, outputPath = OUTPUT_FILE_PATH, buildOptions = {}) {
  if (!existsSync(BUILT_DECK_JS_FILE_PATH) || !existsSync(BUILT_DECK_CSS_FILE_PATH)) {
    // TODO: Rethink this.
    //       * Either the version of Reveal is fixed and these files can be pre-compiled
    //       * Or it should depend on the child project and the resolution of Node packages must evolve
    logInfo('Bundling input deck file');
    await bundle(DECK_JS_FILE_PATH, BUILD_AREA_PATH, REPOSITORY_ROOT_PATH);
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

  const unMinified = finalDom.toHtml();
  const minified = minify(unMinified);
  writeTextFileSync(outputPath, minified);
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

function addRevealJs (dom) {
  const style = readTextFileSync(BUILT_DECK_CSS_FILE_PATH);
  dom.insertInlineStyle('REVEAL', style, INSERT_POSITIONS.AFTER_BEGIN);

  const script = readTextFileSync(BUILT_DECK_JS_FILE_PATH)
    .replaceAll('<script>', '<"+"script>')
    .replaceAll('</script>', '</"+"script>');
  dom.insertInlineScript('REVEAL', script, INSERT_POSITIONS.AFTER_BEGIN);

  return dom;
}
