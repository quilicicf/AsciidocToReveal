// import minifyHtml from '@minify-html/node';
import { minifyHTML } from "https://deno.land/x/minify/mod.ts";

const MINIFIER_CONFIGURATION = {
  keep_spaces_between_attributes: false,
  keep_comments: false,
  minify_js: true,
  minify_css: true,
};

export function minify (code) {
  return minifyHTML(code, {
    minifyCSS: true,
    minifyJS: true,
  });
}
