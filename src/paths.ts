import { resolve } from './third-party/path/api.ts';

// Folders
export const SRC_FOLDER: string = import.meta.dirname as string;
export const REPOSITORY_ROOT_PATH: string = resolve(SRC_FOLDER, '..');
export const LIB_FOLDER: string = resolve(REPOSITORY_ROOT_PATH, 'lib');
export const DIAGRAM_STYLES_FOLDER: string = resolve(LIB_FOLDER, 'diagrams');
export const TEST_FOLDER: string = resolve(REPOSITORY_ROOT_PATH, 'test');
export const DIST_FOLDER_PATH: string = resolve(REPOSITORY_ROOT_PATH, 'dist');
export const NODE_MODULES_PATH: string = resolve(REPOSITORY_ROOT_PATH, 'node_modules');
export const DECK_BASE_FOLDER_PATH: string = resolve(REPOSITORY_ROOT_PATH, 'bundled');
export const DECK_BASE_JS_FILE_PATH: string = resolve(DECK_BASE_FOLDER_PATH, 'deckBase.js');
export const DECK_BASE_CSS_FILE_PATH: string = resolve(DECK_BASE_FOLDER_PATH, 'deckBase.css');
