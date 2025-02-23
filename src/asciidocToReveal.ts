import deckToHtml from './asciidoc/deckToHtml.ts';
import parseDeck from './asciidoc/parseDeck.ts';
import highlightCode from './code/highlightCode.ts';
import insertCustomFiles from './custom-files/insertCustomFiles.ts';
import { DIST_FOLDER_PATH } from './paths.ts';
import processFragments from './fragments/processFragments.ts';
import buildGraphs from './graphs/buildGraphs.ts';
import applyLayouts from './layouts/applyLayouts.ts';
import embedSvgIcons from './svg-icons/embedSvgIcons.ts';
import applyTheme from './themes/applyTheme.ts';
import { mkdirIfNotExistsSync, writeTextFileSync } from './third-party/fs/api.ts';
import { minify } from './third-party/minifier/api.ts';
import { getParentFolderName, resolve } from './third-party/path/api.ts';
import insertLiveReload from './live-reload/insertLiveReload.ts';
import addRevealJs from './reveal/addReveal.ts';
import { BuildOptions, DomTransformer } from './domain/api.ts';

const OUTPUT_FILE_PATH: string = resolve(DIST_FOLDER_PATH, 'deck.html');

/**
 * Transforms an asciidoc file to a Deck on which A2R features can be implemented.
 */
export async function asciidocToReveal (inputPath: string, outputPath: string = OUTPUT_FILE_PATH, buildOptions: BuildOptions = {}) {
  const deck = parseDeck(inputPath, buildOptions);
  mkdirIfNotExistsSync(deck.cachePath);
  mkdirIfNotExistsSync(getParentFolderName(outputPath));

  const baseDom = deckToHtml(deck);
  const transformers: DomTransformer[] = [
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
    (promise, transform) => promise.then((dom) => transform(dom, deck)),
    Promise.resolve(baseDom),
  );

  const unMinified = finalDom.toHtml();
  const minified = minify(unMinified);
  writeTextFileSync(outputPath, minified);

  return deck;
}
