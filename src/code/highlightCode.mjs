// import { create as createRange } from 'npm:jsdom/lib/jsdom/living/generated/Range.js';
import jsdom from 'npm:jsdom';
import Prism from 'npm:prismjs';
import loadLanguages from 'npm:prismjs/components/index.js';

import { NODE_MODULES_PATH } from '../folders.mjs';
import { DEFAULT_THEME } from '../themes/applyTheme.mjs';
import { readdirSync, readTextFileSync } from '../third-party/fs/api.mjs';
import { _, logInfo, theme } from '../third-party/logger/api.mjs';
import { logError } from '../third-party/logger/api.mjs';
import { resolve } from '../third-party/path/api.mjs';

const CLASSIC_PRISM_THEMES_PATH = resolve(NODE_MODULES_PATH, 'prismjs', 'themes');
const EXTENDED_PRISM_THEMES_PATH = resolve(NODE_MODULES_PATH, 'prism-themes', 'themes');

const PRISM_PLUGINS = {
  'line-numbers': {
    cssPath: resolve(NODE_MODULES_PATH, 'prismjs', 'plugins', 'line-numbers', 'prism-line-numbers.css'),
    additionalCss: `pre.highlight.line-numbers code { overflow: unset; }`,
    pluginPath: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.js',
  },
  'keep-markup': {
    cssPath: undefined,
    additionalCss: '',
    pluginPath: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/keep-markup/prism-keep-markup.min.js',
  },
};

export const HIGHLIGHT_THEMES = findAllThemes();
export const DEFAULT_DARK_HIGHLIGHT_THEME = 'one-dark';
export const DEFAULT_LIGHT_HIGHLIGHT_THEME = 'one-light';

export default async function highlightCode (dom, { configuration }) {
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

  const highlightStyles = buildHighlightStyles(themeName, highlightThemeDark, highlightThemeLight, themeSwitchingMode);
  const preparedDom = await prepareHighlighting(dom, pluginsToActivate, highlightStyles);
  Prism.highlightAllUnder(preparedDom.document); // NOTE: MUTATES AST!
  return preparedDom;
}

function buildHighlightStyles (themeName, highlightThemeDark, highlightThemeLight, themeSwitchingMode) {
  const darkThemeCssPath = findThemeCssPath(highlightThemeDark);
  const darkTheme = readTextFileSync(darkThemeCssPath);
  const lightThemeCssPath = findThemeCssPath(highlightThemeLight);
  const lightTheme = readTextFileSync(lightThemeCssPath);

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

  return { id: 'PRISM', css: `@media (prefers-color-scheme: dark) { ${darkTheme} } @media (prefers-color-scheme: light) { ${lightTheme} }` };
}

async function prepareHighlighting (dom, pluginsToActivate, highlightStyles) {
  // FIXME: check that it works
  global = {};
  global.window = window; // NOTE: required for Prism plugins, emulates a browser environment
  window.document = dom.document; // NOTE: required for Prism plugins, emulates a browser environment
  window.getComputedStyle = () => ''; // Line-numbers plugin uses it as if in a browser => window instead of global
  window.addEventListener = () => {}; // Line-numbers plugin uses it as if in a browser => window instead of global

  window.document.Error = function(crap) { return Error(crap); };
  global.Error = function(crap) { return Error(crap); };
  window.Error = function(crap) { return Error(crap); };

  const dom2 = new jsdom.JSDOM('<html></html>');
  console.log(dom2);

  document.createRange = () => {
    return {  };
  };

  const pluginsCss = await pluginsToActivate
    .reduce(
      (promise, plugin) => promise.then(async (seed) => {
        await import(plugin.pluginPath);
        const pluginCss = plugin.cssPath ? readTextFileSync(plugin.cssPath) : '';
        return `${seed}${pluginCss}${plugin.additionalCss}`;
      }),
      Promise.resolve(''),
    );

  dom.insertInlineStyle('PRISM_PLUGINS', pluginsCss);
  highlightStyles.forEach(({ id, css }) => { dom.insertInlineStyle(id, css); });
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
  if (!HIGHLIGHT_THEMES[ themeName ]) {
    const availableThemes = Object.keys(HIGHLIGHT_THEMES).join(', ');
    logError(_`Unknown theme ${themeName}, using default theme (${DEFAULT_THEME}). Available themes are: [ ${availableThemes} ]`(
      { nodes: [ theme.error, theme.success, theme.strong ] },
    ));
    return DEFAULT_THEME;
  }
  return HIGHLIGHT_THEMES[ themeName ];
}
