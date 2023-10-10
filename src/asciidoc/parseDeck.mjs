import Processor from '@asciidoctor/core';
import { dirname, resolve } from 'path';

import { parseConfiguration } from './configuration/deckConfiguration.mjs';
import registerEmojisExtension from './emojis/asciidoctor-emojis.mjs';
import registerGraphAnimationExtension from './graph-animations/asciidoctor-graph-animations.mjs';

export default function parseDeck (inputPath) {
  const inputFolder = findInputFolder(inputPath);
  const processor = new Processor();
  const emojisRegister = registerEmojisExtension(processor.Extensions);
  const graphAnimationsRegister = registerGraphAnimationExtension(processor.Extensions);
  const ast = processor.loadFile(inputPath, { catalog_assets: true });
  const configuration = parseConfiguration(ast, inputFolder);
  return {
    ast,
    emojisRegister,
    graphAnimationsRegister,
    inputFolder,
    configuration,
  };
}

function findInputFolder (inputPath) {
  const folderPath = dirname(inputPath);
  return folderPath.startsWith('/') // TODO: not Windows-friendly
    ? folderPath
    : resolve(process.cwd(), folderPath); // TODO: not Deno-friendly
}
