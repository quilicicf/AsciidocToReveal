import deckToHtml from './asciidoc/deckToHtml.mjs';
import parseDeck from './asciidoc/parseDeck.mjs';
import highlightCode from './code/highlightCode.mjs';
import insertCustomFiles from './custom-files/insertCustomFiles.mjs';
import { DIST_FOLDER_PATH } from './paths.mjs';
import processFragments from './fragments/processFragments.mjs';
import buildGraphs from './graphs/buildGraphs.mjs';
import applyLayouts from './layouts/applyLayouts.mjs';
import embedSvgIcons from './svg-icons/embedSvgIcons.mjs';
import applyTheme from './themes/applyTheme.mjs';
import { mkdirIfNotExistsSync, writeTextFileSync } from './third-party/fs/api.mjs';
import { minify } from './third-party/minifier/api.mjs';
import { getParentFolderName, resolve } from './third-party/path/api.mjs';
import insertLiveReload from './live-reload/insertLiveReload.mjs';
import addRevealJs from './reveal/addReveal.mjs';

const OUTPUT_FILE_PATH = resolve(DIST_FOLDER_PATH, 'deck.html');

/**
 * Transforms an asciidoc file to a Deck on which A2R features can be implemented.
 *
 * @param inputPath {string}
 * @param outputPath {string}
 * @param buildOptions {A2R.BuildOptions}
 * @returns {Promise<A2R.Deck>}
 */
export async function asciidocToReveal (inputPath, outputPath = OUTPUT_FILE_PATH, buildOptions = {}) {
  const deck = parseDeck(inputPath, buildOptions);
  mkdirIfNotExistsSync(deck.cachePath);
  mkdirIfNotExistsSync(getParentFolderName(outputPath));

  const baseDom = deckToHtml(deck);
  /** @type {A2R.DomTransformer[]} */
  const transformers = [
    embedSvgIcons,
    buildGraphs,
    highlightCode,
    applyLayouts,
    applyTheme,
    insertCustomFiles,
    insertLiveReload,
    processFragments,
    addRevealJs,
  ];
  const finalDom = await transformers.reduce(
    (promise, transform) => promise.then(async (dom) => transform(dom, deck)),
    /** @type {Promise<A2R.Dom>} */ Promise.resolve(baseDom),
  );

  const unMinified = finalDom.toHtml();
  const minified = minify(unMinified);
  writeTextFileSync(outputPath, minified);

  return deck;
}
