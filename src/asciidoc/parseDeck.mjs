import Processor from 'npm:@asciidoctor/core';

import { hashString } from '../third-party/crypto/api.mjs';
import { readTextFileSync } from '../third-party/fs/api.mjs';
import { getParentFolderName, isAbsolute, resolve } from '../third-party/path/api.mjs';
import { parseConfiguration } from './configuration/deckConfiguration.mjs';
import registerEmojisExtension from './emojis/asciidoctor-emojis.mjs';
import registerGraphAnimationExtension from './graph-animations/asciidoctor-graph-animations.mjs';
import registerGraphExtension from './graphs/asciidoctor-graphs.mjs';

export default async function parseDeck (inputPath, buildOptions) {
  const inputFolder = findInputFolder(inputPath);
  const cachePath = resolve(inputFolder, '.a2r-cache');
  const builtDeckJsFilePath = resolve(cachePath, 'deck.js');
  const builtDeckCssFilePath = resolve(cachePath, 'deck.css');

  const processor = new Processor();
  const emojisRegister = registerEmojisExtension(processor.Extensions, cachePath);
  const graphsRegister = registerGraphExtension(processor.Extensions);
  const graphAnimationsRegister = registerGraphAnimationExtension(processor.Extensions);

  const ast = processor.loadFile(inputPath, { catalog_assets: true });
  const configuration = parseConfiguration(ast, inputFolder);
  const inputHash = computeDeckHash(inputPath, configuration);

  return {
    ast,
    emojisRegister,
    graphsRegister,
    graphAnimationsRegister,
    inputHash,
    inputFolder,
    cachePath,
    builtDeckJsFilePath,
    builtDeckCssFilePath,
    configuration,
    graphTypes: [], // Added when graphs are converted because mermaid detects the type, we rely on it
    buildOptions,
  };
}

// FIXME: this will need a revamp, as ideally all the assets should be inputs for the hashing
export function computeDeckHash (inputPath, { customCss, customJs }) {
  const input = [ inputPath, customCss, customJs ]
    .filter(Boolean)
    .map((filePath) => readTextFileSync(filePath))
    .join('');

  return hashString(input);
}

function findInputFolder (inputPath) {
  const folderPath = getParentFolderName(inputPath);
  return isAbsolute(folderPath) ? folderPath : resolve(Deno.cwd(), folderPath); // TODO: permissions for cwd?
}
