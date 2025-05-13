import asciidoctor, { Asciidoctor } from 'npm:@asciidoctor/core';

import { hashBuffer, hashString } from '../third-party/crypto/api.ts';
import {
  FileSystemPath, getCwd,
  getParentFolderName,
  readAsBufferSync,
  readDirRecursive,
  resolve,
} from '../third-party/file-system/api.ts';
import { parseConfiguration } from './configuration/deckConfiguration.ts';
import registerEmojisExtension from './emojis/asciidoctor-emojis.ts';
import registerGraphAnimationExtension from './graph-animations/asciidoctor-graph-animations.ts';
import registerGraphExtension from './graphs/asciidoctor-graphs.ts';
import registerInlineSvgIconsExtension from './inline-svg-icons/asciidoctor-inline-svg-icons.ts';
import { BuildOptions, Deck, DeckConfiguration } from '../domain/api.ts';

/**
 * Parses the Asciidoc file into a Deck ready for transformation to HTML
 */
export default async function parseDeck (inputPath: FileSystemPath, buildOptions: BuildOptions): Promise<Deck> {
  const inputFolder = findInputFolder(inputPath);
  const cachePath = resolve(inputFolder, '.a2r-cache');

  const processor: Asciidoctor = asciidoctor();
  registerInlineSvgIconsExtension(processor.Extensions);
  const emojisRegister = registerEmojisExtension(processor.Extensions, cachePath);
  const graphsRegister = registerGraphExtension(processor.Extensions);
  const graphAnimationsRegister = registerGraphAnimationExtension(processor.Extensions);

  const ast = processor.loadFile(inputPath, { catalog_assets: true });
  const configuration = parseConfiguration(ast, inputFolder);
  const inputHash = await computeDeckHash(inputPath, configuration);

  return {
    ast,
    emojisRegister,
    graphsRegister,
    graphAnimationsRegister,
    inputHash,
    inputFolder,
    cachePath,
    configuration,
    graphTypes: [], // Added when graphs are converted because mermaid detects the type, we rely on it
    buildOptions,
    svgIcons: {}, // Added later FIXME : add there instead of later, duh
  };
}

export async function computeDeckHash (inputPath: FileSystemPath, { assetsPath }: DeckConfiguration): Promise<string> {
  const assets = await readDirRecursive(assetsPath);
  const hashes = await Promise.all(
    [ inputPath, ...assets ]
      .filter(Boolean)
      .map((filePath) => ({ filePath, content: readAsBufferSync(filePath) }))
      .map(async ({ filePath, content }) => `${filePath}:${await hashBuffer(content)}`),
  );

  return await hashString(hashes.join('\n'));
}

function findInputFolder (inputPath: FileSystemPath): FileSystemPath {
  const folderPath = getParentFolderName(inputPath);
  return folderPath.startsWith('/') // TODO: not Windows-friendly
    ? folderPath
    : resolve(getCwd(), folderPath);
}
