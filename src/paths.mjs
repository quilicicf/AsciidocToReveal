import { getParentFolderName, resolve, fileUrlToPath } from './third-party/path/api.mjs';

function getModuleFolder (importMeta) {
  return resolve(getParentFolderName(fileUrlToPath(importMeta.url)));
}

// Folders
export const SRC_FOLDER = getModuleFolder(import.meta);
export const REPOSITORY_ROOT_PATH = resolve(SRC_FOLDER, '..');
export const LIB_FOLDER = resolve(REPOSITORY_ROOT_PATH, 'lib');
export const DIAGRAM_STYLES_FOLDER = resolve(LIB_FOLDER, 'diagrams');
export const TEST_FOLDER = resolve(REPOSITORY_ROOT_PATH, 'test');
export const DIST_FOLDER_PATH = resolve(REPOSITORY_ROOT_PATH, 'dist');
export const NODE_MODULES_PATH = resolve(REPOSITORY_ROOT_PATH, 'node_modules');
export const DECK_BASE_FOLDER_PATH = resolve(REPOSITORY_ROOT_PATH, 'bundled');
export const DECK_BASE_JS_FILE_PATH = resolve(DECK_BASE_FOLDER_PATH, 'deckBase.js');
export const DECK_BASE_CSS_FILE_PATH = resolve(DECK_BASE_FOLDER_PATH, 'deckBase.css');
