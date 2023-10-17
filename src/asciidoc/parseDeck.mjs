import Processor from '@asciidoctor/core';
import { dirname, resolve } from 'path';

import { hashString } from '../third-party/crypto/api.mjs';
import { readTextFileSync } from '../third-party/fs/api.mjs';
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
  const inputHash = readTextFileSync(inputPath, hashString);
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

function findInputFolder (inputPath) {
  const folderPath = dirname(inputPath);
  return folderPath.startsWith('/') // TODO: not Windows-friendly
    ? folderPath
    : resolve(process.cwd(), folderPath); // TODO: not Deno-friendly
}
