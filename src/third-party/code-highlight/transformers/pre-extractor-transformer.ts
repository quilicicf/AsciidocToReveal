import { ShikiTransformer } from 'npm:@shikijs/types';
import { Element as HastElement, Root as HastRoot } from 'npm:@types/hast';

import { castClasses } from './common.ts';

export interface ExtractedPreAttributes {
  classes: string[];
  style: string;
}

export interface PreExtractorShikiTransformer extends ShikiTransformer {
  getExtractedPreAttributes: () => ExtractedPreAttributes;
}

export function createPreAttributesExtractorTransformer (): PreExtractorShikiTransformer {
  const extractedPreAttributes: ExtractedPreAttributes = { style: '', classes: [] };
  return {
    name: 'a2r-pre-extractor',
    root (root: HastRoot) {
      const preNode = root.children[ 0 ] as HastElement;
      extractedPreAttributes.classes = castClasses(preNode.properties?.class);
      extractedPreAttributes.style = (preNode?.properties?.style || '') as string;
    },
    getExtractedPreAttributes () {
      return extractedPreAttributes;
    },
  };
}
