import { transformerNotationErrorLevel } from 'npm:@shikijs/transformers';

import {
  addMarkerIfMissing,
  BackgroundColor,
  castClasses,
  CLASS_MARKER,
  HastElement,
  StyleGeneratingTransformer,
} from './common.ts';

enum ClassMap {
  ERROR = 'error',
  WARNING = 'warning',
  SUCCESS = 'success',
}

const CLASS_PRE: string = 'has-error-level';

const STYLE: string = `\
pre.${CLASS_PRE} {
  & span.line {
    & > .${CLASS_MARKER} {
      width: 1.3rem;
      display: inline-block;
    }

    &.${ClassMap.SUCCESS} {
      background-color: ${BackgroundColor.POSITIVE} !important;
      --shiki-dark-bg: ${BackgroundColor.POSITIVE} !important;

      & > .${CLASS_MARKER}:before {
        content: '✅';
        font-size: 1rem;
      }

      & > * {
        background-color: transparent !important;
        --shiki-dark-bg: transparent !important;
      }
    }
    
    &.${ClassMap.ERROR} {
      background-color: ${BackgroundColor.NEGATIVE} !important;
      --shiki-dark-bg: ${BackgroundColor.NEGATIVE} !important;

      & > .${CLASS_MARKER}:before {
        content: '🔥';
        font-size: 1rem;
      }

      & > * {
        background-color: transparent !important;
        --shiki-dark-bg: transparent !important;
      }
    }
    
    &.${ClassMap.WARNING} {
      background-color: ${BackgroundColor.SO_SO} !important;
      --shiki-dark-bg: ${BackgroundColor.SO_SO} !important;

      & > .${CLASS_MARKER}:before {
        content: '⚠️';
        font-size: 1rem;
      }
      
      & > * {
        background-color: transparent !important;
        --shiki-dark-bg: transparent !important;
      }
    }
  }
}`;

export function errorLevelTransformer (): StyleGeneratingTransformer {
  let style: string = '';
  return {
    ...transformerNotationErrorLevel({
      classMap: ClassMap,
      classActivePre: CLASS_PRE,
    }),
    name: 'a2r-error-level-transformer',
    pre (pre) {
      if (castClasses(pre.properties?.class).includes(CLASS_PRE)) {
        style = STYLE;
        const code = pre.children[ 0 ] as HastElement;
        const lines = code.children as HastElement[];
        code.children = lines
          .map((line: HastElement) => addMarkerIfMissing(line));
      }
    },
    getStyle () {
      return style;
    },
  };
}
