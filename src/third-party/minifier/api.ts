import { minifyHTML } from 'https://deno.land/x/minify/mod.ts';

export function minify (code: string): string {
  return code;
  // return minifyHTML(code, { // FIXME : minifies pre tags (facepalm)
  //   minifyCSS: true,
  //   minifyJS: true,
  // });
}
