#!/usr/bin/env deno

import { Deck, DeckConfiguration, Dom } from '../domain/api.ts';
import { _, logInfo, theme } from '../third-party/logger/log.ts';
import { CodeHighlighter, createCodeHighlighter, HighlightedCode } from '../third-party/code-highlight/api.ts';
import { findParentRecursively } from '../third-party/dom/api.ts';

export default async function highlightCodeInDeck (dom: Dom, { configuration }: Deck): Promise<Dom> {
  const { themeSwitchingMode } = configuration;
  const codeNodes = dom.selectAll('pre code[data-lang]');
  const languages: string[] = [
    ...new Set(
      codeNodes.map((node) => node.getAttribute('data-lang') as string),
    ),
  ].sort();

  const preClasses: string[] = [
    ...codeNodes
      .map((codeNode) => findParentRecursively(codeNode, (parent) => parent.classList.contains('listingblock')))
      .filter(Boolean)
      .map((adocContainingBlock) => Array.from((adocContainingBlock as Element).classList))
      .reduce(
        (seed, classNames) => {
          classNames.forEach((className) => seed.add(className));
          return seed;
        },
        new Set<string>(),
      ),
  ];

  if (!languages.length) { return dom; }

  logInfo(_`Highlighting languages: [ ${languages.join(', ')} ]`({ nodes: [ theme.strong ] }));

  const codeHighlighter = createCodeHighlighter();

  if (themeSwitchingMode !== 'none') {
    const themeSwitcherStyle = codeHighlighter.createThemeSwitcherStyle(themeSwitchingMode);
    dom.insertInlineStyle('HIGHLIGHT_THEME_SWITCHER', themeSwitcherStyle);
  }

  const pluginStyles = await codeHighlighter.createPluginsStyle(preClasses, configuration);
  dom.insertInlineStyle('HIGHLIGHT_PLUGINS', pluginStyles);

  await Promise.all(
    codeNodes
      .map(async (codeNode) => {
        await renderCode(dom, codeNode, configuration, codeHighlighter);
      }),
  );

  const css = await codeHighlighter.generateGlobalStyle();
  dom.insertInlineStyle('HIGHLIGHT', css);

  return dom;
}

async function renderCode (dom: Dom, codeNode: Element, deckConfiguration: DeckConfiguration, codeHighlighter: CodeHighlighter): Promise<void> {
  const language = codeNode.getAttribute('data-lang') as string;
  const code = codeNode.textContent as string;

  const highlightedCode: HighlightedCode = await codeHighlighter.render(code, language, deckConfiguration);

  const preNode = codeNode.parentElement as Element;
  preNode.classList.add(...highlightedCode.classes);
  preNode.setAttribute('style', highlightedCode.style);

  const container = dom.newElement('div', [], {}, highlightedCode.content);
  const newPreNode = container.querySelector('pre') as HTMLPreElement;
  preNode.innerHTML = newPreNode.innerHTML;
}
