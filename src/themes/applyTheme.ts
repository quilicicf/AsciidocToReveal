import 'npm:reveal.js';

import { LIB_FOLDER, NODE_MODULES_PATH } from '../paths.ts';
import { LchColor, oklchToHex } from '../third-party/colors/api.ts';
import { existsSync, readTextFileSync, resolve, writeTextFileSync } from '../third-party/file-system/api.ts';
import { _, logInfo, logWarn, theme } from '../third-party/logger/log.ts';
import { compileStyle } from '../third-party/sass/api.ts';
import { DarkStyle, Deck, Dom, LightStyle, Theme, ThemeClass, ThemeColor, ThemeName } from '../domain/api.ts';
import { MANUAL_THEME_SWITCHER } from './manualThemeSwitcher.ts';
import { processCss } from '../third-party/css/api.ts';

const BASE_SCSS_PATH = resolve(LIB_FOLDER, 'theme', 'base.scss');

const REPLACEMENT_TAG = '// EXPORT_PART //';
export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
  LIGHT_AND_DARK_MANUAL: 'light-and-dark-manual',
  DARK_AND_LIGHT_MANUAL: 'dark-and-light-manual',
  LIGHT_AND_DARK_AUTO: 'light-and-dark-auto',
};
export const DEFAULT_COLOR: LchColor = { light: .6, chroma: .1, hue: 170 };
export const DEFAULT_THEME = THEMES.DARK;

export default function applyTheme (dom: Dom, { cachePath, configuration }: Deck) {
  const { themeName, themeColor, startingThemeName, themeSwitchingMode } = configuration;

  const { light, chroma, hue } = themeColor;
  const stringColor = `oklch-${light}-${chroma}-${hue}`;
  const builtThemeFilePath = resolve(cachePath, `${themeName}-${stringColor}.css`);
  if (!existsSync(builtThemeFilePath)) {
    const css = buildThemeStyle(themeName, themeColor);
    writeTextFileSync(builtThemeFilePath, css);
  }

  const builtCss = readTextFileSync(builtThemeFilePath);
  dom.insertInlineStyle('REVEAL_THEME', builtCss);

  if (themeSwitchingMode === 'manual') {
    (dom.select('body') as Element)
      .classList
      .add(`theme-${startingThemeName}`);
    dom.insertInlineScript('THEME_SWITCHER', MANUAL_THEME_SWITCHER);
  }

  return dom;
}

function buildThemeStyle (themeName: ThemeName, themeColor: ThemeColor) {
  logInfo('Bundling theme file');
  const colorExports = prepareColorExports(themeName, themeColor);
  const baseScss = readTextFileSync(BASE_SCSS_PATH);
  return compileStyle(baseScss.replace(REPLACEMENT_TAG, colorExports), NODE_MODULES_PATH);
}

export async function insertThemedStyles (dom: Dom, styleIdPrefix: string, lightStyle: LightStyle, darkStyle: DarkStyle, deck: Deck) {
  const { themeName } = deck.configuration;

  switch (themeName) {
    case THEMES.DARK:
      dom.insertInlineStyle(`${styleIdPrefix}_DARK`, darkStyle);
      return;

    case THEMES.LIGHT:
      dom.insertInlineStyle(`${styleIdPrefix}_LIGHT`, lightStyle);
      return;

    case THEMES.DARK_AND_LIGHT_MANUAL:
    case THEMES.LIGHT_AND_DARK_MANUAL: {
      const fullStyle = await processCss(
        [
          `body.${ThemeClass.DARK} { ${darkStyle} }`,
          `body.${ThemeClass.LIGHT} { ${lightStyle} }`,
        ].join(''),
      );
      dom.insertInlineStyle(styleIdPrefix, `${fullStyle}`);
      return;
    }

    case THEMES.LIGHT_AND_DARK_AUTO: {
      const autoSwitchingStyle = `
        @media (prefers-color-scheme: dark) { ${darkStyle} }
        @media (prefers-color-scheme: light) { ${lightStyle} }
      `;
      dom.insertInlineStyle(styleIdPrefix, autoSwitchingStyle);
      return;
    }

    default:
      logWarn(_`Unsupported theme name ${themeName}`({ nodes: [ theme.strong ] }));
      return;
  }
}

function prepareDarkColorExport (theme: Theme) {
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
  
    --r-background-color: #191919;
    --a2r-color-border: #545454;
    --a2r-color-code-background: #303030;
  
    --r-heading1-text-shadow: 2px 2px 2px ${primaryColorDarkest};
  
    --r-link-color: ${primaryColor};
    --r-link-color-dark: ${primaryColorLight};
    --r-link-color-hover: ${primaryColorLight};
  
    --r-selection-color: ${primaryColorDarkest};
    --r-selection-background-color: ${primaryColorLight};
  
    // FONTS
    --r-main-font: Ubuntu, 'sans-serif';
    --r-heading-font: Ubuntu, 'sans-serif';
    --r-code-font: 'Fira code', monospace;
  `;
}

function prepareLightColorExport (theme: Theme) {
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
  
    --r-background-color: #f5f5f5;
    --a2r-color-border: #c9c9c9;
    --a2r-color-code-background: #e1e1e1;
  
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

function maxOf (a: number, b: number) {
  return a > b ? a : b;
}

function minOf (a: number, b: number) {
  return a < b ? a : b;
}

function createTheme ({ light, chroma, hue }: ThemeColor): Theme {
  return {
    primaryColor: oklchToHex(light, chroma, hue),
    primaryColorLight: oklchToHex(maxOf(light + .2, 1), chroma, hue),
    primaryColorLighter: oklchToHex(.94, .005, hue),
    primaryColorLightest: oklchToHex(.99, .005, hue),
    primaryColorDark: oklchToHex(minOf(light - .2, 0), chroma, hue),
    primaryColorDarker: oklchToHex(.06, .005, hue),
    primaryColorDarkest: oklchToHex(.01, .005, hue),
  };
}

function prepareColorExports (themeName: ThemeName, themeColor: ThemeColor): string {
  const theme = createTheme(themeColor);
  switch (themeName) {
    case THEMES.DARK:
      return `body { ${prepareDarkColorExport(theme)} }`;
    case THEMES.LIGHT:
      return `body { ${prepareLightColorExport(theme)} }`;
    case THEMES.LIGHT_AND_DARK_AUTO:
      return `
        @media (prefers-color-scheme: dark) { body { ${prepareDarkColorExport(theme)} } }
        @media (prefers-color-scheme: light) { body { ${prepareLightColorExport(theme)} } }
      `;
    case THEMES.DARK_AND_LIGHT_MANUAL:
    case THEMES.LIGHT_AND_DARK_MANUAL:
      return `
        body.${ThemeClass.DARK} { ${prepareDarkColorExport(theme)} }
        body.${ThemeClass.LIGHT} { ${prepareLightColorExport(theme)} }
      `;
    default :
      throw Error(`Unsupported theme ${themeName}`);
  }
}
