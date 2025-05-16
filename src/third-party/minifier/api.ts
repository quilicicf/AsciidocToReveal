import { minify } from 'minify-html';

export function minifyHtml (code: string): string {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return decoder.decode(minify(encoder.encode(code), {}));
}
