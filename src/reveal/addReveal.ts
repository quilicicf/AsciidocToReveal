import { readTextFileSync } from '../third-party/file-system/api.ts';
import { DECK_BASE_CSS_FILE_PATH, DECK_BASE_JS_FILE_PATH } from '../paths.ts';
import { Dom } from '../domain/api.ts';

export default function addRevealJs (dom: Dom): Dom {
  const style = readTextFileSync(DECK_BASE_CSS_FILE_PATH);
  dom.insertInlineStyle('REVEAL', style, 'afterbegin');

  const script = readTextFileSync(DECK_BASE_JS_FILE_PATH)
    .replaceAll('<script>', '<"+"script>')
    .replaceAll('</script>', '</"+"script>');
  dom.insertInlineScript('REVEAL', script, 'afterbegin');

  return dom;
}
