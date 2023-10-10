import Processor from '@asciidoctor/core';
import { dirname } from 'path';
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME } from '../code/highlightCode.mjs';

import registerEmojisExtension from './emojis/asciidoctor-emojis.mjs';
import registerGraphAnimationExtension from './graph-animations/asciidoctor-graph-animations.mjs';

export default function parseDeck (inputPath) {
  const inputFolder = dirname(inputPath);
  const processor = new Processor();
  const emojisRegister = registerEmojisExtension(processor.Extensions);
  const graphAnimationsRegister = registerGraphAnimationExtension(processor.Extensions);
  const ast = processor.loadFile(inputPath, { catalog_assets: true });
  const configuration = parseConfiguration(ast);
  return {
    ast,
    emojisRegister,
    graphAnimationsRegister,
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
  const themeSwitchingMode = themeName.endsWith(('-manual')) ? 'manual' : 'auto';
  const startingThemeName = themeName.split('-')[ 0 ];
  const nonStartingThemeName = startingThemeName === 'dark' ? 'light' : 'dark';
  const themeHue = ast.getAttribute('a2r-theme-hue') || 170;
  const themeChromaLevel = ast.getAttribute('a2r-theme-chroma-level') || 'pastel';
  const highlightThemeDark = ast.getAttribute('a2r-highlight-theme-dark') || DEFAULT_DARK_THEME;
  const highlightThemeLight = ast.getAttribute('a2r-highlight-theme-light') || DEFAULT_LIGHT_THEME;

  return {
    customJs,
    customCss,
    favicon,
    pageTitle,
    shouldFragmentLists,

    themeName,
    themeHue,
    themeChromaLevel,
    startingThemeName,
    nonStartingThemeName,
    themeSwitchingMode,
    highlightThemeDark,
    highlightThemeLight,
  };
}
