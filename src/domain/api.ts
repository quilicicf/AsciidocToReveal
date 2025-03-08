import { Block, Document as AsciiDoc, Extensions, Reader, Registry } from 'npm:@asciidoctor/core';
import { LchColor } from '../third-party/colors/api.ts';

export type AsciidoctorDocument = AsciiDoc;
export type AsciidoctorImageReference = AsciiDoc.ImageReference;
export type AsciidoctorReader = Reader;
export type AsciidoctorBlock = Block;
export type AsciidoctorExtensions = typeof Extensions;
export type AsciidoctorRegistry = Registry;
export type AsciidoctorInlineMacroProcessor = Extensions.InlineMacroProcessor;
export type AsciidoctorInlineMacroProcessorDsl = Extensions.InlineMacroProcessorDsl;
export type AsciidoctorBlockProcessor = Extensions.BlockProcessor;
export type AsciidoctorBlockProcessorDsl = Extensions.BlockProcessorDsl;

export enum ThemeClass {
  LIGHT = 'theme-light',
  DARK = 'theme-dark',
}

export enum PreferredImageType {
  SVG = 'svg',
  JXL = 'jxl',
  AVIF = 'avif',
  WEBP = 'webp',
}

export enum DiscouragedImageType {
  PNG = 'png',
  JPG = 'jpg',
  JPEG = 'jpeg',
}

export interface Emoji {
  filePath: string,
  cssClass: string,
  fetcher: Promise<void>,
}

export interface GraphAnimation {
  selector: string;
  classes: string[];
  attributes: Record<string, string>;
}

export interface EmbeddableImage {
  name: string;
  cssClass: string;
  dataUri: string;
}

export interface Image extends EmbeddableImage {
  id: string;
  type: string;
}

export type EmojiMap = Record<string, Emoji>;
export type GraphMap = Record<string, string>;
export type GraphAnimationsMap = Record<string, GraphAnimation[]>;
export type ThemeFamily = 'dark' | 'light';
export type ThemeName = ThemeFamily | 'light-and-dark-manual' | 'dark-and-light-manual' | 'light-and-dark-auto';
export type ThemeColor = LchColor;
export type ThemeSwitchingMode = 'manual' | 'auto' | 'none';

export interface Theme {
  primaryColor: string;
  primaryColorLight: string;
  primaryColorLighter: string;
  primaryColorLightest: string;
  primaryColorDark: string;
  primaryColorDarker: string;
  primaryColorDarkest: string;
}

export enum UserSetDeckConfigurationKey {
  ASSETS_PATHS = 'assetsPath',
  CUSTOM_JS = 'customJs',
  CUSTOM_CSS = 'customCss',
  FAVICON = 'favicon',
  SVG_ICONS_FOLDER = 'svgIconsFolder',
  PAGE_TITLE = 'pageTitle',
  SHOULD_FRAGMENT_LIST = 'shouldFragmentLists',
  SHOULD_FRAGMENT_TABLES = 'shouldFragmentTables',
  THEME_NAME = 'themeName',
  THEME_COLOR = 'themeColor',
  HIGHLIGHT_THEME_DARK = 'highlightThemeDark',
  HIGHLIGHT_THEME_LIGHT = 'highlightThemeLight',
}

enum AutoSetDeckConfigurationKey {
  STARTING_THEME_NAME = 'startingThemeName',
  NON_STARTING_THEME_NAME = 'nonStartingThemeName',
  THEME_SWITCHING_MODE = 'themeSwitchingMode',
}

export interface DeckConfiguration {
  [ UserSetDeckConfigurationKey.ASSETS_PATHS ]: string;
  [ UserSetDeckConfigurationKey.CUSTOM_JS ]: string;
  [ UserSetDeckConfigurationKey.CUSTOM_CSS ]: string;
  [ UserSetDeckConfigurationKey.FAVICON ]: string;
  [ UserSetDeckConfigurationKey.SVG_ICONS_FOLDER ]: string;
  [ UserSetDeckConfigurationKey.PAGE_TITLE ]: string;
  [ UserSetDeckConfigurationKey.SHOULD_FRAGMENT_LIST ]: boolean;
  [ UserSetDeckConfigurationKey.SHOULD_FRAGMENT_TABLES ]: boolean;

  [ UserSetDeckConfigurationKey.THEME_NAME ]: ThemeName,
  [ UserSetDeckConfigurationKey.THEME_COLOR ]: ThemeColor;
  [ UserSetDeckConfigurationKey.HIGHLIGHT_THEME_DARK ]: string;
  [ UserSetDeckConfigurationKey.HIGHLIGHT_THEME_LIGHT ]: string;

  // Auto-generated part
  [ AutoSetDeckConfigurationKey.STARTING_THEME_NAME ]: ThemeFamily;
  [ AutoSetDeckConfigurationKey.NON_STARTING_THEME_NAME ]: ThemeFamily;
  [ AutoSetDeckConfigurationKey.THEME_SWITCHING_MODE ]: ThemeSwitchingMode;
}

export interface BuildOptions {
  shouldAddLiveReload?: boolean;
}

export interface SvgIcon {
  id: string;
  svg: string;
}

export interface Deck {
  ast: AsciidoctorDocument,
  emojisRegister: EmojiMap,
  graphsRegister: GraphMap,
  graphAnimationsRegister: GraphAnimationsMap,
  inputHash: string,
  inputFolder: string,
  cachePath: string,
  configuration: DeckConfiguration,
  graphTypes: string[],
  svgIcons: string[],
  buildOptions: BuildOptions,
}

export type InsertPosition = 'beforeend' | 'afterbegin';

export interface Dom {
  getWindow: () => Window;
  getDocument: () => Document;

  select: (selector: string) => Element | null;
  selectAll: (selector: string) => Element[];
  newElement: (tag: string, classes: string[], attributes: Record<string, string>, content?: string) => Element;
  changeElementTag: (element: Element, newTag: string) => void;
  insertHtml: (selector: string, html: string, position?: InsertPosition) => void;
  insertInlineStyle: (styleId: string, styleContent: string, stylePosition?: InsertPosition) => void;
  insertInlineScript: (styleId: string, styleContent: string, stylePosition?: InsertPosition) => void;
  toHtml: () => string;
}

export type DomTransformer = SyncDomTransformer | AsyncDomTransformer;
export type SyncDomTransformer = (dom: Dom, deck: Deck) => Dom;
export type AsyncDomTransformer = (dom: Dom, deck: Deck) => Promise<Dom>;
