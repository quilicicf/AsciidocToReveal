import { FileSystemPath, resolve } from './third-party/file-system/api.ts';

// Folders
export const SRC_FOLDER: FileSystemPath = import.meta.dirname as FileSystemPath;
export const REPOSITORY_ROOT_PATH: FileSystemPath = resolve(SRC_FOLDER, '..');
export const LIB_FOLDER: FileSystemPath = resolve(REPOSITORY_ROOT_PATH, 'lib');
export const DIAGRAM_STYLES_FOLDER: FileSystemPath = resolve(LIB_FOLDER, 'diagrams');
export const TEST_FOLDER: FileSystemPath = resolve(REPOSITORY_ROOT_PATH, 'test');
export const DIST_FOLDER_PATH: FileSystemPath = resolve(REPOSITORY_ROOT_PATH, 'dist');
export const NODE_MODULES_PATH: FileSystemPath = resolve(REPOSITORY_ROOT_PATH, 'node_modules');
export const DECK_BASE_FOLDER_PATH: FileSystemPath = resolve(REPOSITORY_ROOT_PATH, 'bundled');
export const DECK_BASE_JS_FILE_PATH: FileSystemPath = resolve(DECK_BASE_FOLDER_PATH, 'deckBase.js');
export const DECK_BASE_CSS_FILE_PATH: FileSystemPath = resolve(DECK_BASE_FOLDER_PATH, 'deckBase.css');
