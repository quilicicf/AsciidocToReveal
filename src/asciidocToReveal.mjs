import deckToHtml from './asciidoc/deckToHtml.mjs';
import parseDeck from './asciidoc/parseDeck.mjs';
import highlightCode from './code/highlightCode.mjs';
import insertCustomFiles from './custom-files/insertCustomFiles.mjs';
import { DIST_FOLDER_PATH, LIB_FOLDER, DECK_BASE_CSS_FILE_PATH, DECK_BASE_JS_FILE_PATH } from './paths.mjs';
import processFragments from './fragments/processFragments.mjs';
import buildGraphs from './graphs/buildGraphs.mjs';
import applyLayouts from './layouts/applyLayouts.mjs';
import embedSvgIcons from './svg-icons/embedSvgIcons.mjs';
import applyTheme from './themes/applyTheme.mjs';
import { INSERT_POSITIONS } from './third-party/dom/api.mjs';
import { mkdirIfNotExistsSync, readTextFileSync, writeTextFileSync } from './third-party/fs/api.mjs';
import { minify } from './third-party/minifier/api.mjs';
import { getParentFolderName, resolve } from './third-party/path/api.mjs';

const OUTPUT_FILE_PATH = resolve(DIST_FOLDER_PATH, 'deck.html');

export async function asciidocToReveal (inputPath, outputPath = OUTPUT_FILE_PATH, buildOptions = {}) {
  const deck = parseDeck(inputPath, buildOptions);
  mkdirIfNotExistsSync(deck.cachePath);
  mkdirIfNotExistsSync(getParentFolderName(outputPath));

  const baseDom = deckToHtml(deck);
  const finalDom = await [
    embedSvgIcons,
    buildGraphs,
    highlightCode,
    applyLayouts,
    applyTheme,
    insertCustomFiles,
    insertLiveReloadScript,
    processFragments,
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

function addRevealJs (dom) {
  const style = readTextFileSync(DECK_BASE_CSS_FILE_PATH);
  dom.insertInlineStyle('REVEAL', style, INSERT_POSITIONS.AFTER_BEGIN);

  const script = readTextFileSync(DECK_BASE_JS_FILE_PATH)
    .replaceAll('<script>', '<"+"script>')
    .replaceAll('</script>', '</"+"script>');
  dom.insertInlineScript('REVEAL', script, INSERT_POSITIONS.AFTER_BEGIN);

  return dom;
}
