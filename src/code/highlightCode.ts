import 'npm:prism-themes';
import Prism from 'npm:prismjs';
import loadLanguages from 'npm:prismjs/components/index.js';

import { NODE_MODULES_PATH } from '../paths.ts';
import { DEFAULT_THEME } from '../themes/applyTheme.ts';
import { readdirSync, readTextFileSync } from '../third-party/fs/api.ts';
import { _, logError, logInfo, theme } from '../third-party/logger/log.ts';
import { resolve } from '../third-party/path/api.ts';
import { Deck, Dom, ThemeName } from '../domain/api.ts';

const CLASSIC_PRISM_THEMES_PATH = resolve(NODE_MODULES_PATH, 'prismjs', 'themes');
const EXTENDED_PRISM_THEMES_PATH = resolve(NODE_MODULES_PATH, 'prism-themes', 'themes');

interface PrismPlugin {
  cssPath?: string;
  additionalCss: string;
  pluginPath: string;
}

interface PrismTheme {
  name: string;
  filePath: string;
}

const PRISM_PLUGINS: Record<string, PrismPlugin> = {
  'line-numbers': {
    cssPath: resolve(NODE_MODULES_PATH, 'prismjs', 'plugins', 'line-numbers', 'prism-line-numbers.css'),
    additionalCss: `pre.highlight.line-numbers code { overflow: unset; }`,
    pluginPath: 'npm:prismjs/plugins/line-numbers/prism-line-numbers.js',
  },
  'keep-markup': {
    cssPath: undefined,
    additionalCss: '',
    pluginPath: 'npm:prismjs/plugins/keep-markup/prism-keep-markup.js',
  },
};

export const HIGHLIGHT_THEMES = findAllThemes();
export const DEFAULT_DARK_HIGHLIGHT_THEME = 'one-dark';
export const DEFAULT_LIGHT_HIGHLIGHT_THEME = 'one-light';

export default async function highlightCode (dom: Dom, { configuration }: Deck): Promise<Dom> {
  const { themeName, highlightThemeDark, highlightThemeLight, themeSwitchingMode } = configuration;
  const languages = [
    ...new Set(
      dom.selectAll('pre code[data-lang]')
        .map((codeNode) => codeNode.getAttribute('data-lang'))
        .sort(),
    ),
  ];

  if (!languages.length) { return dom; }

  logInfo(_`Highlighting languages: [ ${languages.join(', ')} ]`({ nodes: [ theme.strong ] }));
  loadLanguages(languages);

  const pluginsToActivate = Object.entries(PRISM_PLUGINS)
    .filter(([ key ]) => dom.selectAll(`.${key}`).length)
    .map(([ , plugin ]) => plugin);

  const highlightStyles: Record<string, string> = buildHighlightStyles(themeName, highlightThemeDark, highlightThemeLight, themeSwitchingMode);
  const preparedDom = await prepareHighlighting(dom, pluginsToActivate, highlightStyles);
  Prism.highlightAllUnder(preparedDom.getDocument()); // NOTE: MUTATES AST!
  return preparedDom;
}

function buildHighlightStyles (themeName: ThemeName, highlightThemeDark: string, highlightThemeLight: string, themeSwitchingMode: string): Record<string, string> {
  const darkThemeCssPath = findThemeCssPath(highlightThemeDark);
  const darkTheme = readTextFileSync(darkThemeCssPath);
  const lightThemeCssPath = findThemeCssPath(highlightThemeLight);
  const lightTheme = readTextFileSync(lightThemeCssPath);

  if (themeName === 'dark') {
    return { PRISM_DARK: darkTheme };
  }
  if (themeName === 'light') {
    return { PRISM_LIGHT: lightTheme };
  }
  if (themeSwitchingMode === 'manual') {
    return {
      PRISM_DARK: darkTheme,
      PRISM_LIGHT: lightTheme,
    };
  }

  return {
    PRISM: `@media (prefers-color-scheme: dark) { ${darkTheme} } @media (prefers-color-scheme: light) { ${lightTheme} }`,
  };
}

async function prepareHighlighting (dom: Dom, pluginsToActivate: PrismPlugin[], highlightStyles: Record<string, string>): Promise<Dom> {
  // @ts-ignore Horrific, but necessary
  globalThis.window = dom.getWindow(); // NOTE: required for Prism plugins, emulates a browser environment
  globalThis.document = dom.getDocument(); // NOTE: required for Prism plugins, emulates a browser environment
  globalThis.getComputedStyle = dom.getWindow().getComputedStyle; // Line-numbers plugin uses it as if in a browser => window instead of global

  const pluginsCss = await pluginsToActivate
    .reduce(
      (promise: Promise<string>, plugin) => promise.then(async (seed) => {
        await import(plugin.pluginPath);
        const pluginCss = plugin.cssPath ? readTextFileSync(plugin.cssPath) : '';
        return `${seed}${pluginCss}${plugin.additionalCss}`;
      }),
      Promise.resolve(''),
    );

  dom.insertInlineStyle('PRISM_PLUGINS', pluginsCss);
  Object.entries(highlightStyles)
    .forEach(([ id, css ]) => { dom.insertInlineStyle(id, css); });
  return dom;
}

function findThemesInModule (modulePath: string): PrismTheme[] {
  const themeFileNameRegex = /^prism-([^.]+)\.min\.css$/;
  return readdirSync(modulePath)
    .filter((themeFileName) => themeFileNameRegex.test(themeFileName))
    .map((fileName) => ({
      name: themeFileNameRegex.exec(fileName)?.[ 1 ] as string,
      filePath: resolve(modulePath, fileName),
    }));
}

function findAllThemes (): Record<string, string> {
  return [ ...findThemesInModule(CLASSIC_PRISM_THEMES_PATH), ...findThemesInModule(EXTENDED_PRISM_THEMES_PATH) ]
    .reduce(
      (seed, { name, filePath }) => ({ ...seed, [ name ]: filePath }),
      { default: resolve(CLASSIC_PRISM_THEMES_PATH, 'prism.min.css') },
    );
}

function findThemeCssPath (themeName: string): string {
  if (!HIGHLIGHT_THEMES[ themeName ]) {
    const availableThemes = Object.keys(HIGHLIGHT_THEMES).join(', ');
    logError(_`Unknown theme ${themeName}, using default theme (${DEFAULT_THEME}). Available themes are: [ ${availableThemes} ]`(
      { nodes: [ theme.error, theme.success, theme.strong ] },
    ));
    return DEFAULT_THEME;
  }
  return HIGHLIGHT_THEMES[ themeName ];
}
