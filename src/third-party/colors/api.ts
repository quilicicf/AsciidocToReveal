import chromaJs from 'npm:chroma-js';

export interface LchColor {
  light: number;
  chroma: number;
  hue: number;
}

export function isValidColor (args: unknown[]): boolean {
  return chromaJs.valid(...args);
}

export function getColorAsLch (input: unknown[]): LchColor {
  const chromaJsColor = chromaJs(...input);
  const [ light, chroma, hue ] = chromaJsColor.oklch();
  return { light, chroma, hue };
}

export function oklchToHex (light: number, chroma: number, hue: number): string {
  return chromaJs.oklch(light, chroma, hue);
} 
