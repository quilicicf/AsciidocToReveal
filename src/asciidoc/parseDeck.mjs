import Processor from '@asciidoctor/core';
import { dirname } from 'path';

import registerEmojisExtension from './emojis/asciidoctor-emojis.mjs';

export default function parseDeck (inputPath) {
  const inputFolder = dirname(inputPath);
  const processor = new Processor();
  const emojisRegister = registerEmojisExtension(processor.Extensions);
  const ast = processor.loadFile(inputPath, { catalog_assets: true });
  const configuration = parseConfiguration(ast);
  return {
    ast,
    emojisRegister,
    inputFolder,
    configuration,
  };
}

function parseConfiguration (ast) {
  const customCss = ast.getAttribute('a2r-css');
  const customJs = ast.getAttribute('a2r-js');
  const highlightTheme = ast.getAttribute('a2r-highlight-theme');
  const shouldFragmentLists = ast.getAttribute('a2r-fragment-lists') === 'true';

  return {
    customJs,
    customCss,
    highlightTheme,
    shouldFragmentLists,
  };
}
