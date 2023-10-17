import chromaJs from 'chroma-js';

export function oklch (light, chroma, hue) {
  return chromaJs.oklch(light, chroma, hue);
} 
