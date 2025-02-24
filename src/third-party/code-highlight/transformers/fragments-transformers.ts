import { transformerNotationMap } from 'npm:@shikijs/transformers';
import { ShikiTransformer } from 'npm:@shikijs/types';

import { castClasses, HastElement } from './common.ts';

const FRAGMENTS_ANNOTATION_REGEX: RegExp = /^f-(?<index>\d+)$/;

const classMap = new Array(20)
  .fill(null)
  .reduce(
    (seed, _ignore, index) => {
      seed[ `f-${index + 1}` ] = `f-${index + 1}`;
      return seed;
    },
    { fragment: 'fragment' } as Record<string, string>,
  );

export const fragmentsPreProcessor: ShikiTransformer = transformerNotationMap(
  { classMap, matchAlgorithm: 'v3' },
  'a2r-fragments-preprocessor',
);

export const fragmentsPostProcessor: ShikiTransformer = {
  name: 'a2r-fragments-postprocessor',
  code (code: HastElement) {
    const lines = code.children as HastElement[];
    code.children = lines
      .map((line) => {
        let fragmentClass: string | null = null;
        const newClasses: string[] = castClasses(line.properties?.class)
          .filter((clazz) => {
            if (!FRAGMENTS_ANNOTATION_REGEX.test(clazz)) {
              return true;
            }
            fragmentClass = clazz;
            return false;
          });

        if (fragmentClass) {
          const {
            groups: { index } = {},
          } = FRAGMENTS_ANNOTATION_REGEX.exec(fragmentClass) as RegExpExecArray;
          newClasses.push('fragment');
          line.properties.class = newClasses;
          line.properties[ 'data-fragment-index' ] = index;
        }
        return line;
      });
    return code;
  },
};
