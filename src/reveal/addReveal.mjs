import { readTextFileSync } from '../third-party/fs/api.mjs';
import { DECK_BASE_CSS_FILE_PATH, DECK_BASE_JS_FILE_PATH } from '../paths.mjs';
import { INSERT_POSITIONS } from '../third-party/dom/api.mjs';

/**
 * @param dom {A2R.Dom}
 * @returns {A2R.Dom}
 */
export default function addRevealJs (dom) {
  const style = readTextFileSync(DECK_BASE_CSS_FILE_PATH);
  dom.insertInlineStyle('REVEAL', style, INSERT_POSITIONS.AFTER_BEGIN);

  const script = readTextFileSync(DECK_BASE_JS_FILE_PATH)
    .replaceAll('<script>', '<"+"script>')
    .replaceAll('</script>', '</"+"script>');
  dom.insertInlineScript('REVEAL', script, INSERT_POSITIONS.AFTER_BEGIN);

  return dom;
}
