import { minifyHTML } from 'https://deno.land/x/minifier@v1.1.1/mod.ts';

const MINIFIER_CONFIGURATION = {
  minifyCSS: true,
  minifyJS: true,
};

export function minify (code) {
  return minifyHTML(code, MINIFIER_CONFIGURATION);
}
