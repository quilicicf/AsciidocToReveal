import Processor from '@asciidoctor/core';

import { hashString } from '../third-party/crypto/api.mjs';
import { readTextFileSync } from '../third-party/fs/api.mjs';
import { getParentFolderName, resolve } from '../third-party/path/api.mjs';
import { parseConfiguration } from './configuration/deckConfiguration.mjs';
import registerEmojisExtension from './emojis/asciidoctor-emojis.mjs';
import registerGraphAnimationExtension from './graph-animations/asciidoctor-graph-animations.mjs';
import registerGraphExtension from './graphs/asciidoctor-graphs.mjs';

export default function parseDeck (inputPath, buildOptions) {
  const inputFolder = findInputFolder(inputPath);
  const processor = new Processor();
  const emojisRegister = registerEmojisExtension(processor.Extensions);
  const graphsRegister = registerGraphExtension(processor.Extensions);
  const graphAnimationsRegister = registerGraphAnimationExtension(processor.Extensions);
  const graphTypes = []; // Added when graphs are converted because mermaid detects the type, we rely on it
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
    configuration,
    graphTypes,
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
  return folderPath.startsWith('/') // TODO: not Windows-friendly
    ? folderPath
    : resolve(process.cwd(), folderPath); // TODO: not Deno-friendly
}
