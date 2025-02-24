import { ShikiTransformer } from 'npm:@shikijs/types';
import { Element } from 'npm:@types/hast';

export type HastElement = Element;

export const CLASS_MARKER: string = 'marker';

export enum BackgroundColor {
  NEUTRAL = '#6575853d',
  POSITIVE = '#10b9813d',
  SO_SO = '#eab3083d',
  NEGATIVE = '#f43f5e3d',
}

export interface StyleGeneratingTransformer extends ShikiTransformer {
  getStyle: () => string;
}

export function castClasses (classOrClasses: boolean | number | string | null | undefined | Array<string | number>): string[] {
  if (!classOrClasses) {
    return [];
  }

  if (!Array.isArray(classOrClasses)) {
    return (classOrClasses as string)
      .split(' '); // Multiple classes can be in an array or space-separated...
  }

  return classOrClasses as string[];
}

export function addMarkerIfMissing (line: HastElement): HastElement {
  const tokens = (
    Array.isArray(line.children)
      ? line.children
      : [ line.children ]
  ) as HastElement[];

  if (castClasses(tokens[ 0 ]?.properties?.class).includes(CLASS_MARKER)) {
    return line;
  }

  line.children = [
    {
      type: 'element',
      tagName: 'span',
      children: [],
      properties: { class: [ CLASS_MARKER ] },
    },
    ...tokens,
  ];
  return line;
}
