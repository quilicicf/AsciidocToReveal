import { LIB_FOLDER } from '../paths.mjs';
import { resolve } from '../third-party/path/api.mjs';
import { readTextFileSync } from '../third-party/fs/api.mjs';

/**
 * @param dom {A2R.Dom}
 * @param deck {A2R.Deck}
 * @returns {A2R.Dom}
 */
export default function insertLiveReload (dom, { inputHash, buildOptions }) {
  if (!buildOptions.shouldAddLiveReload) { return dom; }

  const liveReloadScriptPath = resolve(LIB_FOLDER, 'liveReload.mjs');
  const liveReloadScript = readTextFileSync(
    liveReloadScriptPath,
    (template) => template.replace('$$HASH$$', inputHash),
  );

  dom.insertInlineScript('LIVE_RELOAD', liveReloadScript);

  return dom;
}
