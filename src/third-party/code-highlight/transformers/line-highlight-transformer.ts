import { transformerNotationHighlight } from 'npm:@shikijs/transformers';

import { BackgroundColor, castClasses, StyleGeneratingTransformer } from './common.ts';

const CLASS_PRE: string = 'has-line-highlight';
const CLASS_LINE: string = 'highlighted-line';

const STYLE: string = `\
pre.${CLASS_PRE} {
  & span.line {
    &.${CLASS_LINE} {
      background-color: ${BackgroundColor.NEUTRAL} !important;
      --shiki-dark-bg: ${BackgroundColor.NEUTRAL} !important;

      & > * {
        background-color: transparent !important;
        --shiki-dark-bg: transparent !important;
      }
    }
  }
}`;

export function lineHighlightTransformer (): StyleGeneratingTransformer {
  let style: string = '';
  return {
    ...transformerNotationHighlight({
      classActiveLine: CLASS_LINE,
      classActivePre: CLASS_PRE,
    }),
    name: 'a2r-notation-highlight-transformer',
    pre (pre) {
      if (castClasses(pre.properties?.class).includes(CLASS_PRE)) {
        style = STYLE;
      }
    },
    getStyle () {
      return style;
    },
  };
}
