import init, { minify } from 'minify-html';

export async function minifyHtml (code: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  await init();
  return decoder.decode(minify(encoder.encode(code), {}));
}
