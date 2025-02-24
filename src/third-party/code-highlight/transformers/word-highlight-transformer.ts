import { transformerNotationWordHighlight } from 'npm:@shikijs/transformers';

import { castClasses, StyleGeneratingTransformer } from './common.ts';

const CLASS_HIGHLIGHTED_WORD: string = 'highlighted-word';
const CLASS_HIGHLIGHT: string = 'has-highlight';

const STYLE: string = `\
.highlighted-word {
  padding: 0 4px;
  border: solid 1px gray;
  border-radius: 4px;
}`;

export function transformerWordHighlight (): StyleGeneratingTransformer {
  let style: string = '';
  return {
    ...transformerNotationWordHighlight({
      classActiveWord: CLASS_HIGHLIGHTED_WORD,
      classActivePre: CLASS_HIGHLIGHT,
    }),
    name: 'a2r-word-highlight-transformer',
    pre (pre) {
      if (castClasses(pre.properties?.class).includes(CLASS_HIGHLIGHT)) {
        style = STYLE;
      }
    },
    getStyle () {
      return style;
    },
  };
};
