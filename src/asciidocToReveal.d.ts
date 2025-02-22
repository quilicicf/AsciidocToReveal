import { Document as AsciidoctorDocument, Extensions } from '@asciidoctor/core';

declare namespace A2R {
  type AsciidoctorExtensions = typeof Extensions;

  interface Emoji {
    filePath: string,
    cssClass: string,
    fetcher: (emojiFilePath: string, emojiName: string, emojiUnicode: string) => Promise<void>,
  }

  type EmojiMap = Record<string, Emoji>;
  type GraphMap = Record<string, string>;
  type GraphAnimationsMap = Record<string, object>;
  type Theme = 'dark' | 'light' | 'light-and-dark-manual' | 'dark-and-light-manual' | 'light-and-dark-auto';

  interface Configuration {
    customJs: string,
    customCss: string,
    favicon: string,
    svgIconsFolder: string,
    pageTitle: string,
    shouldFragmentLists: boolean,
    shouldFragmentTables: boolean,

    themeName: Theme,
    themeColor: [number, number, number],
    highlightThemeDark: string,
    highlightThemeLight: string,
  }

  interface BuildOptions {
    shouldAddLiveReload?: boolean;
  }

  interface SvgIcon {
    id: string;
    svg: string;
  }

  interface Deck {
    ast: AsciidoctorDocument,
    emojisRegister: (register: AsciidoctorExtensions, cachePath: string) => EmojiMap,
    graphsRegister: (register: AsciidoctorExtensions) => GraphMap,
    graphAnimationsRegister: (register: AsciidoctorExtensions) => GraphAnimationsMap,
    inputHash: string,
    inputFolder: string,
    cachePath: string,
    configuration: Configuration,
    graphTypes: string[],
    svgIcons: string[],
    buildOptions: BuildOptions,
  }

  type InsertPosition = 'beforeend' | 'afterbegin';

  interface Dom {
    select: (selector: string) => Element;
    selectAll: (selector: string) => Element[];
    newElement: (tag: string, classes: string[], attributes: Record<string, string>) => Element;
    changeElementTag: (element: Element, newTag: string) => void;
    insertHtml: (selector: string, html: string, position?: InsertPosition) => void;
    insertInlineStyle: (styleId: string, styleContent: string, stylePosition?: InsertPosition) => void;
    insertInlineScript: (styleId: string, styleContent: string, stylePosition?: InsertPosition) => void;
    toHtml: () => string;
  }

  type DomTransformer = (dom: Dom, deck: Deck) => Dom;

  interface MermaidProcessor {
    close: () => Promise<void>;
    render: (mermaidText: string, inputSvgId: string) => Promise<string>;
  }
}
