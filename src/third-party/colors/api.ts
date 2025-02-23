import chromaJs from 'npm:chroma-js';

export function oklch (light: number, chroma: number, hue: number) {
  return chromaJs.oklch(light, chroma, hue);
} 
