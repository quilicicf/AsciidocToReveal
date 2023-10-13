import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

function getModuleFolder (importMeta) {
  return resolve(dirname(fileURLToPath(importMeta.url)));
}

// Folders
export const SRC_FOLDER = getModuleFolder(import.meta);
export const REPOSITORY_ROOT_PATH = resolve(SRC_FOLDER, '..');
export const LIB_FOLDER = resolve(REPOSITORY_ROOT_PATH, 'lib');
export const DIAGRAM_STYLES_FOLDER = resolve(LIB_FOLDER, 'diagrams');
export const TEST_FOLDER = resolve(REPOSITORY_ROOT_PATH, 'test');
export const BUILD_AREA_PATH = resolve(REPOSITORY_ROOT_PATH, 'build-area');
export const DIST_FOLDER_PATH = resolve(REPOSITORY_ROOT_PATH, 'dist');
export const NODE_MODULES_PATH = resolve(REPOSITORY_ROOT_PATH, 'node_modules');
