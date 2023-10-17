import minifyHtml from '@minify-html/node';

const MINIFIER_CONFIGURATION = {
  keep_spaces_between_attributes: false,
  keep_comments: false,
  minify_js: true,
  minify_css: true,
};

export function minify (code) {
  return minifyHtml.minify(Buffer.from(code), MINIFIER_CONFIGURATION)
    .toString('utf8');
}
