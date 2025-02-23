import asciidoctor, { Asciidoctor } from 'npm:@asciidoctor/core';

import { hashString } from '../third-party/crypto/api.ts';
import { readTextFileSync } from '../third-party/fs/api.ts';
import { getParentFolderName, resolve } from '../third-party/path/api.ts';
import { parseConfiguration } from './configuration/deckConfiguration.ts';
import registerEmojisExtension from './emojis/asciidoctor-emojis.ts';
import registerGraphAnimationExtension from './graph-animations/asciidoctor-graph-animations.ts';
import registerGraphExtension from './graphs/asciidoctor-graphs.ts';
import registerInlineSvgIconsExtension from './inline-svg-icons/asciidoctor-inline-svg-icons.ts';
import { BuildOptions, Deck, DeckConfiguration } from '../domain/api.ts';

/**
 * Parses the Asciidoc file into a Deck ready for transformation to HTML
 */
export default async function parseDeck (inputPath: string, buildOptions: BuildOptions): Promise<Deck> {
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
    svgIcons: [], // Added later FIXME : add there instead of later, duh
  };
}

// FIXME: this will need a revamp, as ideally all the assets should be inputs for the hashing
export async function computeDeckHash (inputPath: string, { customCss, customJs }: DeckConfiguration): Promise<string> {
  const input = [ inputPath, customCss, customJs ]
    .filter(Boolean)
    .map((filePath) => readTextFileSync(filePath))
    .join('');

  return await hashString(input);
}

function findInputFolder (inputPath: string): string {
  const folderPath = getParentFolderName(inputPath);
  return folderPath.startsWith('/') // TODO: not Windows-friendly
    ? folderPath
    : resolve(Deno.cwd(), folderPath); // TODO: not Deno-friendly
}
