import { removeFromParent, replaceInParent, toDom } from '../third-party/dom/api.ts';
import { existsSync, readAsBase64Sync, readTextFileSyncAndConvert, statSync } from '../third-party/fs/api.ts';

import { _, logError, logWarn, theme } from '../third-party/logger/log.ts';
import { getBaseName, getExtension, join, resolve } from '../third-party/path/api.ts';
import processBlocksRecursively from './processBlocksRecursively.ts';
import {
  AsciidoctorBlock,
  AsciidoctorImageReference,
  Deck,
  DiscouragedImageType,
  Dom,
  DomTransformer,
  EmbeddableImage,
  Image,
  PreferredImageType,
} from '../domain/api.ts';

const BASE_HTML = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title></title>
  </head>
  <body>

  <div class="reveal">
    <div class="slides">
      <section id="deck-title">
        <h1></h1>
      </section>
    </div>
  </div>
  
  </body>
  </html>
`;

/**
 * Converts input deck into a DOM.
 */
export default function deckToHtml (deck: Deck): Promise<Dom> {
  const baseDom: Dom = toDom(BASE_HTML);
  const transformers: DomTransformer[] = [
    insertFavicon,
    insertTitleSection,
    insertOtherSections,
    embedImages,
    embedEmojis,
    fixupCodeBlocks,
    extractSpeakerNotes,
  ];
  return transformers.reduce(
    (promise, transform) => promise.then((dom) => transform(dom, deck)),
    Promise.resolve(baseDom),
  );
}

function insertFavicon (dom: Dom, { configuration }: Deck): Dom {
  const { favicon } = configuration;
  if (favicon) {
    const extension = getExtension(favicon);
    const type = extension.replace(/^\./g, '');
    const dataUri = readFileToDataUri(type, favicon);
    const head = dom.select('head') as Element;
    head.insertAdjacentHTML('afterbegin', `<link rel="icon" href="${dataUri}"/>`);
  }

  return dom;
}

/**
 * Takes the header of the asciidoc file and creates a title section for it.
 */
function insertTitleSection (dom: Dom, { ast, configuration }: Deck): Dom {
  const titleDoc = ast.getDocumentTitle() as string;
  dom.insertHtml('h1', titleDoc || 'You should add a title');

  const titleText = configuration.pageTitle
    || dom.select('h1')?.textContent?.trim()
    || 'You should add a title';
  dom.insertHtml('head title', titleText);

  const preambleDoc = ast.getBlocks()?.[ 0 ];
  if (preambleDoc?.context === 'preamble') {
    dom.insertHtml('#deck-title', preambleDoc.convert());
  }

  return dom;
}

/**
 * Finds all the sections (other than title, see above) and creates section tags for them in the HTML.
 * Note: the asciidoc and HTML format don't have the same topology!
 *       In Asciidoc, the sections are appended one after another.
 *       In HTML, a section tag must contain the h2-level section and all children h3-level sections.
 *       This requires re-working the structure of the page.
 */
function insertOtherSections (dom: Dom, { ast }: Deck): Dom {
  const [ , ...nonTitleSectionDocs ] = ast.getBlocks();
  nonTitleSectionDocs.forEach((sectionDoc) => {
    const sectionHtml = sectionDoc.convert();
    const slidesNode = dom.select('.slides') as Element;
    slidesNode
      .insertAdjacentHTML('beforeend', sectionHtml);
    if (sectionHtml.includes('sect2')) { // Has subsections
      const topLevelSectionAsDiv = dom.select('div.sect1') as Element;
      const subSectionsAsDivs = dom.selectAll('div.sect2');

      // Cleanup
      slidesNode.removeChild(topLevelSectionAsDiv);
      subSectionsAsDivs.forEach((subSectionAsDiv) => removeFromParent(subSectionAsDiv));

      // Create wrapping section
      const wrappingSection = dom.newElement('section', [], {});
      slidesNode.appendChild(wrappingSection);

      // Re-add sections
      wrappingSection.appendChild(topLevelSectionAsDiv);
      subSectionsAsDivs.forEach((subSectionAsDiv) => wrappingSection.appendChild(subSectionAsDiv));
    }

    dom.selectAll('div.sect1,div.sect2')
      .forEach((sectionAsDiv) => dom.changeElementTag(sectionAsDiv, 'section'));
  });

  return dom;
}

/**
 * Finds all the images in the original asciidoc file and embeds them in a CSS stylesheet.
 * Each file is assigned a unique CSS class based on its name and each use of the file is replaced
 * with an HTML element applying the image with the CSS associated with the class.
 *
 * This allows embedding all images in the HTML file without repeating them multiple times.
 */
function embedImages (dom: Dom, { ast, inputFolder }: Deck): Dom {
  const images: Record<string, Image> = ast.getImages()
    .reduce(
      (seed, image: AsciidoctorImageReference) => {
        const name = image.getTarget();
        const imageRelativePath = join(image.getImagesDirectory() || '', name); // FIXME : from where by default ?
        const imageAbsolutePath = resolve(inputFolder, imageRelativePath);

        try {
          const extension = getExtension(name);
          const type = extension.replace(/^\./g, '');
          const dataUri = readFileToDataUri(type, imageAbsolutePath);
          const id = getBaseName(name, extension);
          const cssClass = `img-${id}`;
          return {
            ...seed,
            [ name ]: { id, cssClass, name, type, dataUri },
          };
        } catch (error) {
          logError(_`Cannot embed image ${name} at ${imageAbsolutePath} >> ${(error as Error).message}`({ nodes: [ theme.strong, theme.strong, undefined ] }));
          return seed;
        }
      },
      {},
    );

  const badImageTypes = Object.values(images)
    .map(({ type }) => type)
    .filter((type) => !Object.values(PreferredImageType).includes(type as PreferredImageType));
  if (badImageTypes.length) {
    const bad = badImageTypes.join(', ');
    const good = Object.values(PreferredImageType).join(', ');
    logWarn(_`Your deck contains inefficient image types [ ${bad} ], consider using [ ${good} ] instead`({ nodes: [ theme.error, theme.success ] }));
  }

  const css = Object.values(images)
    .reduce((seed, image) => `${seed} .${image.cssClass} { display: inline-block; background-size: cover; background-image: url('${image.dataUri}'); }`, '');

  dom.selectAll('.image,.imageblock')
    .forEach((parentNode) => {
      const imgNode = parentNode.querySelector('img') as HTMLImageElement;
      const imageName = getBaseName(imgNode.src);
      const image = images[ imageName ];

      if (!image) { return parentNode.innerHTML = `<span>Image "${imageName}" not found</span>`; }

      const style = parentNode.classList.contains('thumb')
        ? 'width: 1em; height: 1em; vertical-align: text-bottom;'
        : `width: ${imgNode.width}px; height: ${imgNode.height}px`;
      const additionalClasses = Array.from(parentNode.classList);
      const newElement = dom.newElement('span', [ image.cssClass, ...additionalClasses ], { style, role: 'image' });
      const grandParentNode = parentNode.parentNode as ParentNode;
      grandParentNode.replaceChild(newElement, parentNode);
    });

  dom.insertInlineStyle('IMAGES', css);

  return dom;
}

function createEmojiCss (emoji: EmbeddableImage): string {
  return [
    `.${emoji.cssClass}`,
    /**/ `{`,
    /*  */ `margin: 0 !important;`,
    /*  */ `display: inline-block;`,
    /*  */ `vertical-align: middle;`,
    /*  */ `background-size: cover;`,
    /*  */ `background-image: url('${emoji.dataUri}');`,
    /**/ `}`,
  ].join(' ');
}

/**
 * Finds all the emojis in the original asciidoc file and embeds them in a CSS stylesheet.
 * Each emoji is assigned a unique CSS class based on its name and each use of the file is replaced
 * with an HTML element applying the emoji with the CSS associated with the class.
 *
 * This allows embedding all emojis in the HTML file without repeating them multiple times.
 */
async function embedEmojis (dom: Dom, { emojisRegister }: Deck): Promise<Dom> {
  await Promise.all( // Wait for all HTTP calls to end and all SVGs to be on disk
    Object.values(emojisRegister)
      .map(({ fetcher }) => fetcher),
  );

  const emojis: Record<string, EmbeddableImage> = Object.entries(emojisRegister)
    .filter(([ , metadata ]) => existsSync(metadata.filePath)) // Sometimes, HTTP GET failed, let's avoid breaking watcher in that case
    .map(([ name, metadata ]) => ({
      name,
      cssClass: metadata.cssClass,
      dataUri: readFileToDataUri('svg', metadata.filePath),
    }))
    .reduce((seed, emoji) => ({ ...seed, [ emoji.name ]: emoji }), {});

  const css = Object.values(emojis)
    .reduce((seed, emoji) => `${seed} ${createEmojiCss(emoji)}`, '');
  dom.insertInlineStyle('EMOJIS', css);

  dom.selectAll('.emoji')
    .forEach((parentNode) => {
      const imgNode = parentNode.querySelector('img') as HTMLImageElement;
      const emojiName = imgNode.alt;

      if (!emojis[ emojiName ]) { return; }

      const cssClass = emojis[ emojiName ].cssClass;
      const style = `width: ${imgNode.getAttribute('width')}; height: ${imgNode.getAttribute('height')}`;
      const newImgNode = dom.newElement('span', [ cssClass ], { style, role: 'image' });
      replaceInParent(imgNode, newImgNode);
    });

  return dom;
}

/**
 * Asciidoctor wrongfully escapes HTML characters in the code blocks.
 * This breaks the keep markup PrismJS plugin which allows showing code fragment per fragment.
 * This method read the real code from the original asciidoc file and fixes the code blocks in the HTML.
 */
function fixupCodeBlocks (dom: Dom, { ast }: Deck): Dom {
  const state = {
    codeBlockIndex: 0,
    multilineCodeBlocks: dom.selectAll('.keep-markup pre code'),
  };
  processBlocksRecursively(
    ast,
    (block: AsciidoctorBlock) => {
      const shouldBeFixed = block.getContentModel() === 'verbatim'
        && block?.getAttribute('role')?.includes('keep-markup');
      if (!shouldBeFixed) { return; }
      const correspondingHtmlCodeBlock = state.multilineCodeBlocks[ state.codeBlockIndex++ ];
      correspondingHtmlCodeBlock.innerHTML = block.getSource();
    },
  );

  return dom;
}

function extractSpeakerNotes (dom: Dom): Dom {
  dom.selectAll('.notes')
    .forEach((notesNode) => dom.changeElementTag(notesNode, 'aside'));
  return dom;
}

function toSvgDataUri (content: string): string {
  const imageText = content
    .replaceAll(/width="[^"]+"/g, '')
    .replaceAll(/height="[^"]+"/g, '')
    .replaceAll('?', '%3F')
    .replaceAll('"', '%22')
    .replaceAll('#', '%23')
    .replaceAll('\n', '')
    .replaceAll(/\s+/g, ' ');
  return `data:image/svg+xml,${imageText}`;
}

export function readFileToDataUri (type: string, filePath: string): string {
  if (!existsSync(filePath)) {
    throw Error(`File not found`);
  }

  if (statSync(filePath).isDirectory) {
    throw Error(`Found folder instead of file`);
  }

  switch (type) {
    case PreferredImageType.SVG:
      return readTextFileSyncAndConvert(filePath, (content: string) => toSvgDataUri(content));
    case PreferredImageType.JXL:
    case PreferredImageType.AVIF:
    case PreferredImageType.WEBP:
    case DiscouragedImageType.PNG:
    case DiscouragedImageType.JPG:
    case DiscouragedImageType.JPEG:
      return `data:image/${type};base64,${readAsBase64Sync(filePath)}`;
    default: {
      const supportedFileTypesMessage = [
        ...Object.values(PreferredImageType),
        ...Object.values(DiscouragedImageType),
      ].join(', ');
      throw Error(_`Unsupported image type: ${type}, try any of [${supportedFileTypesMessage}]`({ nodes: [ theme.error ] }));
    }
  }
}
