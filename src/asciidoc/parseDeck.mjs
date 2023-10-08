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
  const favicon = ast.getAttribute('a2r-favicon');
  const pageTitle = ast.getAttribute('a2r-page-title');
  const shouldFragmentLists = ast.getAttribute('a2r-fragment-lists') === 'true';

  const themeName = ast.getAttribute('a2r-theme-name') || 'dark';
  const themeHue = ast.getAttribute('a2r-theme-hue') || 170;
  const themeChromaLevel = ast.getAttribute('a2r-theme-chroma-level') || 'pastel';
  const highlightTheme = ast.getAttribute('a2r-highlight-theme');

  return {
    customJs,
    customCss,
    favicon,
    pageTitle,
    shouldFragmentLists,

    themeName,
    themeHue,
    themeChromaLevel,
    highlightTheme,
  };
}
