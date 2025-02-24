import { transformerNotationDiff } from 'npm:@shikijs/transformers';

import {
  BackgroundColor,
  StyleGeneratingTransformer,
  castClasses,
  HastElement,
  addMarkerIfMissing,
  CLASS_MARKER,
} from './common.ts';

const CLASS_PRE: string = 'has-diff';
const DIFF_CLASS_PREFIX: string = 'diff-';
const CLASS_LINE_ADD: string = `${DIFF_CLASS_PREFIX}a`;
const CLASS_LINE_REMOVE: string = `${DIFF_CLASS_PREFIX}r`;

const STYLE: string = `\
pre.${CLASS_PRE} {
  & span.line {
    & > .${CLASS_MARKER} {
      width: 1.3rem;
      display: inline-block;
    }
    
    &.${CLASS_LINE_ADD} {
      background-color: ${BackgroundColor.POSITIVE} !important;
      --shiki-dark-bg: ${BackgroundColor.POSITIVE} !important;

      & > .${CLASS_MARKER}:before {
        content: '+';
      }

      & > * {
        background-color: transparent !important;
        --shiki-dark-bg: transparent !important;
      }
    }
    
    &.${CLASS_LINE_REMOVE} {
      background-color: ${BackgroundColor.NEGATIVE} !important;
      --shiki-dark-bg: ${BackgroundColor.NEGATIVE} !important;

      & > .${CLASS_MARKER}:before {
        content: '-';
      }

      & > * {
        background-color: transparent !important;
        --shiki-dark-bg: transparent !important;
      }
    }
  }
}`;

export function diffTransformer (): StyleGeneratingTransformer {
  let style: string = '';
  return {
    ...transformerNotationDiff({
      classLineAdd: CLASS_LINE_ADD,
      classLineRemove: CLASS_LINE_REMOVE,
      classActivePre: CLASS_PRE,
    }),
    name: 'a2r-diff-transformer',
    pre (pre: HastElement): HastElement {
      if (castClasses(pre.properties?.class).includes(CLASS_PRE)) {
        style = STYLE;
        const code = pre.children[ 0 ] as HastElement;
        const lines = code.children as HastElement[];
        code.children = lines
          .map((line: HastElement) => addMarkerIfMissing(line));
      }
      return pre;
    },
    getStyle () {
      return style;
    },
  };
}
