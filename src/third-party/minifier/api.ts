import { minifyHTML } from 'https://deno.land/x/minify/mod.ts';

export function minify (code: string): string {
  return minifyHTML(code, {
    minifyCSS: true,
    minifyJS: true,
  });
}
