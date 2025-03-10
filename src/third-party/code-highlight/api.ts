import { BundledTheme, bundledThemes, codeToHtml } from 'npm:shiki';
import { transformerColorizedBrackets } from 'npm:@shikijs/colorized-brackets';
import { CodeOptionsThemes, ShikiTransformer, ThemeRegistration } from 'npm:@shikijs/types';

import { DeckConfiguration, ThemeClass, ThemeFamily, ThemeSwitchingMode } from '../../domain/api.ts';
import { diffTransformer } from './transformers/diff-transformer.ts';
import { lineHighlightTransformer } from './transformers/line-highlight-transformer.ts';
import { transformerWordHighlight } from './transformers/word-highlight-transformer.ts';
import { errorLevelTransformer } from './transformers/error-level-transformer.ts';
import { mermaidTransformer } from './transformers/mermaid-transformer.ts';
import { fragmentsPostProcessor, fragmentsPreProcessor } from './transformers/fragments-transformers.ts';
import { cssExtractorTransformer } from './transformers/css-extractor-transformer.ts';
import {
  createPreAttributesExtractorTransformer,
  ExtractedPreAttributes,
} from './transformers/pre-extractor-transformer.ts';
import { StyleGeneratingTransformer } from './transformers/common.ts';
import { processCss } from '../css/api.ts';

export interface HighlightThemes {
  light: string[];
  dark: string[];
}

export interface HighlightedCode extends ExtractedPreAttributes {
  content: string;
}

export interface CodeHighlighter {
  render: (code: string, language: string, deckConfiguration: DeckConfiguration) => Promise<HighlightedCode>;
  generateGlobalStyle: () => Promise<string>;
  createThemeSwitcherStyle: (themeSwitchingMode: ThemeSwitchingMode) => string;
  createPluginsStyle: (preClasses: string[], deckConfiguration: DeckConfiguration) => Promise<string>;
}

enum CodeHighlightPlugin {
  LINE_NUMBERS = 'line-numbers',
}

export const HIGHLIGHT_THEMES: HighlightThemes = await Object.entries(bundledThemes)
  .reduce(
    (promise, [ key, value ]) => promise.then(async (seed) => {
      const { default: themeRegistration } = await value();
      if (themeRegistration.type === 'dark') {
        seed.dark.push(key);
      } else {
        seed.light.push(key);
      }
      return seed;
    }),
    Promise.resolve({ light: [], dark: [] }) as Promise<HighlightThemes>,
  );
export const DEFAULT_DARK_HIGHLIGHT_THEME: BundledTheme = 'github-dark-dimmed';
export const DEFAULT_LIGHT_HIGHLIGHT_THEME: BundledTheme = 'github-light';

/** See https://shiki.style/guide/dual-themes */
const THEME_SWITCHERS: Record<ThemeSwitchingMode, string> = {
  auto: [
    `@media (prefers-color-scheme: dark) {`,
    `  .shiki, .shiki span {`,
    `    color: var(--shiki-dark) !important;`,
    `    background-color: var(--shiki-dark-bg) !important;`,
    `  }`,
    `}`,
  ].join('\n'),
  manual: [
    `body.theme-dark .shiki, body.theme-dark .shiki span {`,
    `  color: var(--shiki-dark) !important;`,
    `  background-color: var(--shiki-dark-bg) !important;`,
    `}`,
  ].join('\n'),
  none: '',
};
const BASE_LINE_NUMBER_CSS: string = [
  `.line-numbers code {`,
  `  counter-reset: step;`,
  `  counter-increment: step 0;`,
  `}`,
  ``,
  `.line-numbers code .line::before {`,
  `  content: counter(step);`,
  `  counter-increment: step;`,
  `  width: 1rem;`,
  `  margin-right: 1rem;`,
  `  display: inline-block;`,
  `  text-align: right;`,
  `}`,
].join('\n');

const PLUGIN_STYLE_GENERATORS: Record<CodeHighlightPlugin, (deckConfiguration: DeckConfiguration) => Promise<string>> = {
  [ CodeHighlightPlugin.LINE_NUMBERS ]: (deckConfiguration: DeckConfiguration) => createLineNumberStyle(deckConfiguration),
};

export function createCodeHighlighter (): CodeHighlighter {
  const transformers: ShikiTransformer[] = [
    transformerColorizedBrackets(),
    diffTransformer(),
    lineHighlightTransformer(),
    transformerWordHighlight(),
    errorLevelTransformer(),
    mermaidTransformer,
    fragmentsPreProcessor,
    fragmentsPostProcessor,
    cssExtractorTransformer(),
  ];

  return {
    async render (code: string, language: string, deckConfiguration: DeckConfiguration): Promise<HighlightedCode> {
      const themeConfig = createThemeConfiguration(deckConfiguration);
      const preAttributesExtractorTransformer = createPreAttributesExtractorTransformer();
      const renderedCode = await codeToHtml(code, {
        lang: language,
        ...themeConfig,
        transformers: [
          ...transformers,
          preAttributesExtractorTransformer, // Must be last
        ],
      });

      const extractedPreAttributes = preAttributesExtractorTransformer.getExtractedPreAttributes();
      return {
        classes: extractedPreAttributes.classes,
        style: extractedPreAttributes.style,
        content: renderedCode,
      };
    },
    async generateGlobalStyle (): Promise<string> {
      const nestedCss = BASE_HIGHLIGHT_STYLE + transformers
        .filter((transformer) => (transformer as StyleGeneratingTransformer)?.getStyle)
        .map((transformer) => (transformer as StyleGeneratingTransformer)?.getStyle() || '')
        .join('');

      return await processCss(nestedCss);
    },
    createThemeSwitcherStyle (themeSwitchingMode: ThemeSwitchingMode): string {
      return THEME_SWITCHERS[ themeSwitchingMode ];
    },
    async createPluginsStyle (preClasses: string[], deckConfiguration: DeckConfiguration): Promise<string> {
      const styles: string[] = await Promise.all(
        preClasses
          .map((preClass) => PLUGIN_STYLE_GENERATORS[ preClass as CodeHighlightPlugin ])
          .filter(Boolean)
          .map(async (styleGenerator) => await styleGenerator(deckConfiguration)),
      );
      return styles.join('');
    },
  };
}

const BASE_HIGHLIGHT_STYLE: string = `\
pre.shiki span.line {
  font-size: 1.2rem !important;
  line-height: 1.5rem !important;

  width: 100%;
  display: inline-block;
}`;

async function createLineNumberStyle (deckConfiguration: DeckConfiguration): Promise<string> {
  const { themeName, highlightThemeLight, highlightThemeDark } = deckConfiguration;
  const { default: themeLight } = await import(`npm:@shikijs/themes/${highlightThemeLight}`);
  const { default: themeDark } = await import(`npm:@shikijs/themes/${highlightThemeDark}`);

  const colors: Record<ThemeFamily, string> = {
    light: extractCommentColor(themeLight, 'rgba(115,138,148,.4)'),
    dark: extractCommentColor(themeDark, 'rgba(115,138,148,.4)'),
  };

  switch (themeName) {
    case 'light':
    case 'dark':
      return [
        BASE_LINE_NUMBER_CSS,
        ``,
        `.line-numbers code .line::before {`,
        `  color: ${colors[ themeName ]};`,
        `}`,
      ].join('\n');
    case 'light-and-dark-auto':
      return [
        BASE_LINE_NUMBER_CSS,
        ``,
        `.line-numbers code .line::before {`,
        `  color: ${colors[ 'light' ]};`,
        `}`,
        ``,
        `@media (prefers-color-scheme: dark) {`,
        `  .line-numbers code .line::before {`,
        `    color: ${colors[ 'dark' ]};`,
        `  }`,
        `}`,
      ].join('\n');
    case 'light-and-dark-manual':
    case 'dark-and-light-manual':
      return [
        BASE_LINE_NUMBER_CSS,
        ``,
        `body.${ThemeClass.LIGHT} .line-numbers code .line::before {`,
        `  color: ${colors[ 'light' ]};`,
        `}`,
        ``,
        `body.${ThemeClass.DARK} .line-numbers code .line::before {`,
        `  color: ${colors[ 'dark' ]};`,
        `}`,
      ].join('\n');
    default:
      throw Error(`Unknown theme name ${themeName}`);
  }
}

function extractCommentColor (theme: ThemeRegistration, defaultColor: string): string {
  return theme
      ?.tokenColors
      ?.filter((tokenColor) => tokenColor?.scope?.includes('comment'))
      ?.map((tokenColor) => tokenColor.settings?.foreground)
      ?.[ 0 ]
    ?? defaultColor;
}

function createThemeConfiguration (deckConfiguration: DeckConfiguration): CodeOptionsThemes<string> {
  const { themeName, highlightThemeLight, highlightThemeDark } = deckConfiguration;
  switch (themeName) {
    case 'light':
      return { theme: highlightThemeLight };
    case 'dark':
      return { theme: highlightThemeDark };
    default:
      return {
        themes: {
          light: highlightThemeLight,
          dark: highlightThemeDark,
        },
      };
  }
}
