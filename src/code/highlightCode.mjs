import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index.js';
import { compileString } from 'sass';
import { stoyle } from 'stoyle';

import { $$, insertInlineStyle } from '../domUtils.mjs';
import { NODE_MODULES_PATH } from '../folders.mjs';
import { logInfo, logWarn, theme } from '../log.mjs';

export const DEFAULT_DARK_THEME = 'one-dark';
export const DEFAULT_LIGHT_THEME = 'one-light';
const CLASSIC_PRISM_THEMES_PATH = resolve(NODE_MODULES_PATH, 'prismjs', 'themes');
const EXTENDED_PRISM_THEMES_PATH = resolve(NODE_MODULES_PATH, 'prism-themes', 'themes');

const PRISM_PLUGINS = {
  'line-numbers': {
    cssPath: resolve(NODE_MODULES_PATH, 'prismjs', 'plugins', 'line-numbers', 'prism-line-numbers.css'),
    additionalCss: `pre.highlight.line-numbers code { overflow: unset; }`,
    pluginPath: 'prismjs/plugins/line-numbers/prism-line-numbers.js',
  },
  'keep-markup': {
    cssPath: undefined,
    additionalCss: '',
    pluginPath: 'prismjs/plugins/keep-markup/prism-keep-markup.js',
  },
};

export default async function highlightCode (dom, { configuration }) {
  const { themeName, highlightThemeDark, highlightThemeLight, themeSwitchingMode } = configuration;
  const languages = [
    ...new Set(
      $$(dom, 'pre code[data-lang]')
        .map((codeNode) => codeNode.getAttribute('data-lang'))
        .sort(),
    ),
  ];

  if (!languages.length) { return dom; }

  logInfo(stoyle`Highlighting languages: [ ${languages.join(', ')} ]`({ nodes: [ theme.strong ] }));
  loadLanguages(languages);

  const pluginsToActivate = Object.entries(PRISM_PLUGINS)
    .filter(([ key ]) => $$(dom, `.${key}`).length)
    .map(([ , plugin ]) => plugin);

  const highlightStyles = buildHighlightStyles(themeName, highlightThemeDark, highlightThemeLight, themeSwitchingMode);
  const preparedDom = await prepareHighlighting(dom, pluginsToActivate, highlightStyles);
  Prism.highlightAllUnder(preparedDom.window.document); // NOTE: MUTATES AST!
  return preparedDom;
}

function buildHighlightStyles (themeName, highlightThemeDark, highlightThemeLight, themeSwitchingMode) {
  const darkThemeCssPath = findThemeCssPath(highlightThemeDark);
  const darkTheme = readFileSync(darkThemeCssPath, 'utf8');
  const lightThemeCssPath = findThemeCssPath(highlightThemeLight);
  const lightTheme = readFileSync(lightThemeCssPath, 'utf8');

  if (themeName === 'dark') {
    return [ { id: 'PRISM_DARK', css: darkTheme } ];
  }
  if (themeName === 'light') {
    return [ { id: 'PRISM_LIGHT', css: lightTheme } ];
  }
  if (themeSwitchingMode === 'manual') {
    return [
      { id: 'PRISM_DARK', css: darkTheme },
      { id: 'PRISM_LIGHT', css: lightTheme },
    ];
  }
  const { css } = compileString(
    `@media (prefers-color-scheme: dark) { ${darkTheme} } @media (prefers-color-scheme: light) { ${lightTheme} }`,
    {
      style: 'compressed',
      loadPaths: [ NODE_MODULES_PATH ],
      sourceMap: false,
      verbose: true,
    },
  );
  return { id: 'PRISM', css };
}

async function prepareHighlighting (dom, pluginsToActivate, highlightStyles) {
  global.window = dom.window; // NOTE: required for Prism plugins, emulates a browser environment
  global.document = dom.window.document; // NOTE: required for Prism plugins, emulates a browser environment
  global.getComputedStyle = window.getComputedStyle; // Line-numbers plugin uses it as if in a browser => window instead of global

  const pluginsCss = await pluginsToActivate
    .reduce(
      (promise, plugin) => promise.then(async (seed) => {
        await import(plugin.pluginPath);
        const pluginCss = plugin.cssPath ? readFileSync(plugin.cssPath, 'utf8') : '';
        return `${seed}${pluginCss}${plugin.additionalCss}`;
      }),
      Promise.resolve(''),
    );

  insertInlineStyle(dom, 'PRISM_PLUGINS', pluginsCss);
  highlightStyles.forEach(({ id, css }) => { insertInlineStyle(dom, id, css); });
  return dom;
}

function findThemesInModule (modulePath) {
  const themeFileNameRegex = /^prism-([^.]+)\.min\.css$/;
  return readdirSync(modulePath)
    .filter((themeFileName) => themeFileNameRegex.test(themeFileName))
    .map((fileName) => ({
      name: themeFileNameRegex.exec(fileName)[ 1 ],
      filePath: resolve(modulePath, fileName),
    }));
}

function findAllThemes () {
  return [ ...findThemesInModule(CLASSIC_PRISM_THEMES_PATH), ...findThemesInModule(EXTENDED_PRISM_THEMES_PATH) ]
    .reduce(
      (seed, { name, filePath }) => ({ ...seed, [ name ]: filePath }),
      { default: resolve(CLASSIC_PRISM_THEMES_PATH, 'prism.min.css') },
    );
}

function findThemeCssPath (themeName) {
  const themes = findAllThemes();
  if (!themes[ themeName ]) {
    logWarn(stoyle`Unknown theme ${themeName}, using default theme (${DEFAULT_THEME}). Available themes are: [ ${Object.keys(themes).join(', ')} ]`(
      { nodes: [ theme.error, theme.success, theme.strong ] },
    ));
    throw Error(`Oopsie, unknown theme ${themeName}`); // TODO: won't be possible once configuration is validated first
  }
  return themes[ themeName ];
}