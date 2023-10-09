import chromaJs from 'chroma-js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { compileString } from 'sass';

import { $, insertInlineScript, insertInlineStyle } from '../domUtils.mjs';
import { BUILD_AREA_PATH, LIB_FOLDER, NODE_MODULES_PATH } from '../folders.mjs';
import { logInfo } from '../log.mjs';

const BASE_SCSS_PATH = resolve(LIB_FOLDER, 'theme', 'base.scss');

const REPLACEMENT_TAG = '// EXPORT_PART //';
const CHROMAS = {
  pastel: 0.100,
  classic: 0.200,
  vibrant: 0.300,
};

export default function applyTheme (dom, { configuration }) {
  const { themeName, themeHue, themeChromaLevel, startingThemeName, nonStartingThemeName, themeSwitchingMode } = configuration;

  const builtThemeFilePath = resolve(BUILD_AREA_PATH, `${themeName}-${themeHue}-${themeChromaLevel}.css`);
  if (!existsSync(builtThemeFilePath)) {
    logInfo('Bundling theme file');
    const colorExports = prepareColorExports(themeName, themeHue, themeChromaLevel);
    const baseScss = readFileSync(BASE_SCSS_PATH, 'utf8');
    const { css } = compileString(
      baseScss.replace(REPLACEMENT_TAG, colorExports),
      {
        style: 'compressed',
        loadPaths: [ NODE_MODULES_PATH ],
        sourceMap: false,
        verbose: true,
      },
    );
    writeFileSync(builtThemeFilePath, css, 'utf8');
  }

  const builtCss = readFileSync(builtThemeFilePath, 'utf8');
  insertInlineStyle(dom, 'REVEAL_THEME', builtCss);

  if (themeSwitchingMode === 'manual') {
    $(dom, 'body').classList.add(`theme-${startingThemeName}`);
    insertInlineScript(
      dom,
      'THEME_SWITCHER',
      `
        function toggleDisabled(id, force = undefined) {
          const sheetNode = document.getElementById('CSS_PRISM_' + id);
          if (!sheetNode) { return; }
          sheetNode.disabled = force === undefined ? !sheetNode.disabled: force;
        }
        
        Reveal.on('ready', () => { toggleDisabled('${nonStartingThemeName.toUpperCase()}', true); });

        Reveal.addKeyBinding( { keyCode: 84, key: 'T', description: 'Switch themes' }, () => {
          const bodyNode = document.querySelector('body');
          bodyNode.classList.toggle('theme-dark');
          bodyNode.classList.toggle('theme-light');
          
          toggleDisabled('DARK');
          toggleDisabled('LIGHT');
        });
      `,
    );
  }

  return dom;
}

function prepareDarkColorExport (theme) {
  const {
    primaryColor,
    primaryColorLight,
    primaryColorLighter,
    primaryColorLightest,
    primaryColorDark,
    primaryColorDarker,
    primaryColorDarkest,
  } = theme;

  return `
    // COLORS
    --r-main-color: ${primaryColorLightest};
    --r-heading-color: ${primaryColorLightest};

    --color-primary: ${primaryColor};

    --color-primary-light: ${primaryColorLight};
    --color-primary-lighter: ${primaryColorLighter};
    --color-primary-lightest: ${primaryColorLightest};

    --color-primary-dark: ${primaryColorDark};
    --color-primary-darker: ${primaryColorDarker};
    --color-primary-darkest: ${primaryColorDarkest};
  
    --r-background-color: ${primaryColorDarkest};
    --a2r-color-code-background: ${primaryColorDarker};
  
    --r-heading1-text-shadow: 2px 2px 2px ${primaryColorDarkest};
  
    --r-link-color: ${primaryColor};
    --r-link-color-dark: ${primaryColorDark};
    --r-link-color-hover: ${primaryColorDark};
  
    --r-selection-color: ${primaryColorDarkest};
    --r-selection-background-color: ${primaryColorLight};
  
    // FONTS
    --r-main-font: Ubuntu, 'sans-serif';
    --r-heading-font: Ubuntu, 'sans-serif';
    --r-code-font: 'Fira code', monospace;
  `;
}

function prepareLightColorExport (theme) {
  const {
    primaryColor,
    primaryColorLight,
    primaryColorLighter,
    primaryColorLightest,
    primaryColorDark,
    primaryColorDarker,
    primaryColorDarkest,
  } = theme;

  return `
    // COLORS
    --r-main-color: ${primaryColorDarkest};
    --r-heading-color: ${primaryColorDarkest};

    --color-primary: ${primaryColor};

    --color-primary-light: ${primaryColorLight};
    --color-primary-lighter: ${primaryColorLighter};
    --color-primary-lightest: ${primaryColorLightest};

    --color-primary-dark: ${primaryColorDark};
    --color-primary-darker: ${primaryColorDarker};
    --color-primary-darkest: ${primaryColorDarkest};
  
    --r-background-color: ${primaryColorLightest};
    --a2r-color-code-background: ${primaryColorLighter};
  
    --r-heading1-text-shadow: 2px 2px 2px ${primaryColorLightest};
  
    --r-link-color: ${primaryColor};
    --r-link-color-dark: ${primaryColorDark};
    --r-link-color-hover: ${primaryColorDark};
  
    --r-selection-color: ${primaryColorLightest};
    --r-selection-background-color: ${primaryColorDark};
  
    // FONTS
    --r-main-font: Ubuntu, 'sans-serif';
    --r-heading-font: Ubuntu, 'sans-serif';
    --r-code-font: 'Fira code', monospace;
  `;
}

function createTheme (hue, chromaLevel) {
  const chroma = CHROMAS[ chromaLevel ];
  return {
    primaryColor: chromaJs.oklch(.6, chroma, hue),
    primaryColorLight: chromaJs.oklch(.8, chroma, hue),
    primaryColorLighter: chromaJs.oklch(.94, .005, hue),
    primaryColorLightest: chromaJs.oklch(.99, .005, hue),
    primaryColorDark: chromaJs.oklch(.4, chroma, hue),
    primaryColorDarker: chromaJs.oklch(.06, .005, hue),
    primaryColorDarkest: chromaJs.oklch(.01, .005, hue),
  };
}

function prepareColorExports (themeName, themeHue, themeChromaLevel) {
  const theme = createTheme(themeHue, themeChromaLevel);
  switch (themeName) {
    case 'dark':
      return `body { ${prepareDarkColorExport(theme)} }`;
    case 'light':
      return `body { ${prepareLightColorExport(theme)} }`;
    case 'dark-and-light-auto':
      return `
        @media (prefers-color-scheme: dark) { body { ${prepareDarkColorExport(theme)} } }
        @media (prefers-color-scheme: light) { body { ${prepareLightColorExport(theme)} } }
      `;
    case 'dark-and-light-manual':
    case 'light-and-dark-manual':
      return `
        body.theme-dark { ${prepareDarkColorExport(theme)} }
        body.theme-light { ${prepareLightColorExport(theme)} }
      `;
  }
}
