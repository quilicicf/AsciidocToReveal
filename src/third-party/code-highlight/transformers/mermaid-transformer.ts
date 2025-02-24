import { ShikiTransformer } from 'npm:@shikijs/types';
import { Element as HastElement } from 'npm:@types/hast';

/**
 * The shiki style for mermaid expects the graph to be embedded in markdown fenced code block.
 * This is weird, this transformer works around the problem by adding the fenced code block
 * to the source code and removing it from the generated HTML.
 */
// noinspection JSUnusedGlobalSymbols
export const mermaidTransformer: ShikiTransformer = {
  name: 'a2r-mermaid-transformer',
  /** Wraps the code in markdown fences */
  preprocess (code, options) {
    if (options.lang === 'mermaid') {
      return `\`\`\`mermaid\n${code}\n\`\`\``;
    }
  },
  /** Removes the fences */
  code (code: HastElement) {
    if (this.options.lang === 'mermaid') {
      const spans = code.children;
      spans.shift(); // Remove ```mermaid line
      spans.shift(); // Remove line break after ```mermaid line
      spans.pop(); // Remove line break before ``` line
      spans.pop(); // Remove ``` line
      return code;
    }
  },
};
