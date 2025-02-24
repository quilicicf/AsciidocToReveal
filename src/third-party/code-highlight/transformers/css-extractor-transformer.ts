import { transformerStyleToClass } from 'npm:@shikijs/transformers';

import { StyleGeneratingTransformer } from './common.ts';

export function cssExtractorTransformer (): StyleGeneratingTransformer {
  const toClassTransformer = transformerStyleToClass({ classPrefix: 'hc-' });
  return {
    ...toClassTransformer,
    name: 'a2r-css-extractor',
    getStyle () {
      return toClassTransformer.getCSS();
    },
  };
}
