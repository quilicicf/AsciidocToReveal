import { LIB_FOLDER } from '../paths.ts';
import { readTextFileSyncAndConvert, resolve } from '../third-party/file-system/api.ts';
import { Deck, Dom } from '../domain/api.ts';

export default function insertLiveReload (dom: Dom, { inputHash, buildOptions }: Deck): Dom {
  if (!buildOptions.shouldAddLiveReload) { return dom; }

  const liveReloadScriptPath = resolve(LIB_FOLDER, 'liveReload.mjs');
  const liveReloadScript = readTextFileSyncAndConvert(
    liveReloadScriptPath,
    (template: string) => template.replaceAll('$$HASH$$', inputHash),
  );

  dom.insertInlineScript('LIVE_RELOAD', liveReloadScript);

  return dom;
}
