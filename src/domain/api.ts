import { Block, Document as AsciiDoc, Extensions, Reader, Registry } from 'npm:@asciidoctor/core';

export type AsciidoctorDocument = AsciiDoc;
export type AsciidoctorReader = Reader;
export type AsciidoctorBlock = Block;
export type AsciidoctorExtensions = typeof Extensions;
export type AsciidoctorRegistry = Registry;
export type AsciidoctorInlineMacroProcessor = Extensions.InlineMacroProcessor;
export type AsciidoctorInlineMacroProcessorDsl = Extensions.InlineMacroProcessorDsl;
export type AsciidoctorBlockProcessor = Extensions.BlockProcessor;
export type AsciidoctorBlockProcessorDsl = Extensions.BlockProcessorDsl;

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
export type ThemeColor = [ number, number, number ];

export interface Theme {
  primaryColor: string;
  primaryColorLight: string;
  primaryColorLighter: string;
  primaryColorLightest: string;
  primaryColorDark: string;
  primaryColorDarker: string;
  primaryColorDarkest: string;
}

export interface DeckConfiguration {
  customJs: string;
  customCss: string;
  favicon: string;
  svgIconsFolder: string;
  pageTitle: string;
  shouldFragmentLists: boolean;
  shouldFragmentTables: boolean;

  themeName: ThemeName,
  themeColor: ThemeColor;
  highlightThemeDark: string;
  highlightThemeLight: string;

  // Auto-generated part
  startingThemeName: ThemeFamily;
  nonStartingThemeName: ThemeFamily;
  themeSwitchingMode: string;
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

  select: (selector: string) => Element| null;
  selectAll: (selector: string) => Element[];
  newElement: (tag: string, classes: string[], attributes: Record<string, string>) => Element;
  changeElementTag: (element: Element, newTag: string) => void;
  insertHtml: (selector: string, html: string, position?: InsertPosition) => void;
  insertInlineStyle: (styleId: string, styleContent: string, stylePosition?: InsertPosition) => void;
  insertInlineScript: (styleId: string, styleContent: string, stylePosition?: InsertPosition) => void;
  toHtml: () => string;
}

export type DomTransformer = SyncDomTransformer | AsyncDomTransformer;
export type SyncDomTransformer = (dom: Dom, deck: Deck) => Dom;
export type AsyncDomTransformer = (dom: Dom, deck: Deck) => Promise<Dom>;
