import { BUILD_AREA_PATH, DIAGRAM_STYLES_FOLDER, LIB_FOLDER, NODE_MODULES_PATH } from '../folders.mjs';
import { oklch } from '../third-party/colors/api.mjs';
import { existsSync, readTextFileSync, writeTextFileSync } from '../third-party/fs/api.mjs';
import { _, logInfo, logWarn, theme } from '../third-party/logger/log.mjs';
import { resolve } from '../third-party/path/api.mjs';
import { compileStyle } from '../third-party/sass/api.mjs';

const BASE_SCSS_PATH = resolve(LIB_FOLDER, 'theme', 'base.scss');

const REPLACEMENT_TAG = '// EXPORT_PART //';
export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
  LIGHT_AND_DARK_MANUAL: 'light-and-dark-manual',
  DARK_AND_LIGHT_MANUAL: 'dark-and-light-manual',
  LIGHT_AND_DARK_AUTO: 'light-and-dark-auto',
};
export const DEFAULT_COLOR = [ .6, .1, 170 ];
export const DEFAULT_THEME = THEMES.DARK;

export default function applyTheme (dom, { graphTypes, configuration }) {
  const { themeName, themeColor, startingThemeName, nonStartingThemeName, themeSwitchingMode } = configuration;

  const [ light, chroma, hue ] = themeColor;
  const stringColor = `oklch-${light}-${chroma}-${hue}`;
  const builtThemeFilePath = resolve(BUILD_AREA_PATH, `${themeName}-${stringColor}.css`);
  if (!existsSync(builtThemeFilePath)) {
    const css = buildThemeStyle(themeName, themeColor);
    writeTextFileSync(builtThemeFilePath, css);
  }

  if (graphTypes.length) {
    logInfo(_`Applying themes for graph types: [ ${graphTypes.join(', ')} ]`({ nodes: [ theme.strong ] }));
    graphTypes.forEach((graphType) => insertGraphStyle(dom, graphType, themeName));
  }

  const builtCss = readTextFileSync(builtThemeFilePath);
  dom.insertInlineStyle('REVEAL_THEME', builtCss);

  if (themeSwitchingMode === 'manual') {
    dom.select('body')
      .classList
      .add(`theme-${startingThemeName}`);
    const manualThemeSwitcherFilePath = resolve(LIB_FOLDER, 'manualThemeSwitcher.mjs');
    const manualThemeSwitcher = readTextFileSync(manualThemeSwitcherFilePath);
    const scriptContent = `
      ${manualThemeSwitcher}
      Reveal.on('ready', () => { toggleDisabled('${nonStartingThemeName.toUpperCase()}', true); });
    `;
    dom.insertInlineScript('THEME_SWITCHER', scriptContent);
  }

  return dom;
}

function buildThemeStyle (themeName, themeHue, themeChromaLevel) {
  logInfo('Bundling theme file');
  const colorExports = prepareColorExports(themeName, themeHue, themeChromaLevel);
  const baseScss = readTextFileSync(BASE_SCSS_PATH);
  return compileStyle(baseScss.replace(REPLACEMENT_TAG, colorExports), NODE_MODULES_PATH);
}

function insertGraphStyle (dom, graphType, themeName) {
  const darkStyleFilePath = resolve(DIAGRAM_STYLES_FOLDER, `${graphType}_dark.css`);
  const darkStyle = readTextFileSync(darkStyleFilePath);
  const lightStyleFilePath = resolve(DIAGRAM_STYLES_FOLDER, `${graphType}_light.css`);
  const lightStyle = readTextFileSync(lightStyleFilePath);
  const styleIdPrefix = graphType.toUpperCase().replaceAll('-', '_');
  switch (themeName) {
    case THEMES.DARK:
      dom.insertInlineStyle(`${styleIdPrefix}_DARK`, darkStyle);
      return;
    case THEMES.LIGHT:
      dom.insertInlineStyle(`${styleIdPrefix}_LIGHT`, lightStyle);
      return;
    case THEMES.DARK_AND_LIGHT_MANUAL:
    case THEMES.LIGHT_AND_DARK_MANUAL:
      dom.insertInlineStyle(`${styleIdPrefix}_DARK`, darkStyle);
      dom.insertInlineStyle(`${styleIdPrefix}_LIGHT`, lightStyle);
      return;

    case THEMES.LIGHT_AND_DARK_AUTO:
      const autoSwitchingStyle = `
        @media (prefers-color-scheme: dark) { body { ${darkStyle} } }
        @media (prefers-color-scheme: light) { body { ${lightStyle} } }
      `;
      dom.insertInlineStyle(`${styleIdPrefix}`, autoSwitchingStyle);
      return;

    default:
      logWarn(_`Unsupported theme name ${themeName}`({ nodes: [ theme.strong ] }));
      return;
  }
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

function maxOf (a, b) {
  return a > b ? a : b;
}

function minOf (a, b) {
  return a < b ? a : b;
}

function createTheme ([ light, chroma, hue ]) {
  return {
    primaryColor: oklch(light, chroma, hue),
    primaryColorLight: oklch(maxOf(light + .2, 1), chroma, hue),
    primaryColorLighter: oklch(.94, .005, hue),
    primaryColorLightest: oklch(.99, .005, hue),
    primaryColorDark: oklch(minOf(light - .2, 0), chroma, hue),
    primaryColorDarker: oklch(.06, .005, hue),
    primaryColorDarkest: oklch(.01, .005, hue),
  };
}

function prepareColorExports (themeName, themeColor) {
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
        body.theme-dark { ${prepareDarkColorExport(theme)} }
        body.theme-light { ${prepareLightColorExport(theme)} }
      `;
  }
}
