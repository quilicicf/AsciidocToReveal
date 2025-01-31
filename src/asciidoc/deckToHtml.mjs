import { removeFromParent, replaceInParent, toDom } from '../third-party/dom/api.mjs';
import { existsSync, readAsBase64Sync, readTextFileSync, statSync } from '../third-party/fs/api.mjs';

import { _, logError, logWarn, theme } from '../third-party/logger/log.mjs';
import { getBaseName, getExtension, join, resolve } from '../third-party/path/api.mjs';
import processBlocksRecursively from './processBlocksRecursively.mjs';

const PREFERRED_IMAGE_TYPES = {
  SVG: 'svg',
  JXL: 'jxl',
  AVIF: 'avif',
  WEBP: 'webp',
};

const SUPPORTED_IMAGE_TYPES = {
  ...PREFERRED_IMAGE_TYPES,
  PNG: 'png',
  JPG: 'jpg',
  JPEG: 'jpeg',
};

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

export default function deckToHtml (deck) {
  const baseDom = toDom(BASE_HTML);
  return [
    insertFavicon,
    insertTitleSection,
    insertOtherSections,
    embedImages,
    embedEmojis,
    fixupCodeBlocks,
    extractSpeakerNotes,
  ].reduce(
    (promise, operation) => promise.then(async (dom) => operation(dom, deck)),
    Promise.resolve(baseDom),
  );
}

function insertFavicon (dom, { configuration }) {
  const { favicon } = configuration;
  if (favicon) {
    const extension = getExtension(favicon);
    const type = extension.replace(/^\./g, '');
    const dataUri = readFileToDataUri(type, favicon);
    dom.select('head')
      .insertAdjacentHTML('afterbegin', `<link rel="icon" href="${dataUri}"/>`);
  }

  return dom;
}

/**
 * Takes the header of the asciidoc file and creates a title section for it.
 */
function insertTitleSection (dom, { ast, configuration }) {
  const titleDoc = ast.getDocumentTitle();
  dom.insertHtml('h1', titleDoc);

  const titleText = configuration.pageTitle || dom.select('h1').textContent.trim();
  dom.insertHtml('head title', titleText);

  const preambleDoc = ast.blocks?.[ 0 ];
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
function insertOtherSections (dom, { ast }) {
  const [ , ...nonTitleSectionDocs ] = ast.blocks;
  nonTitleSectionDocs.forEach((sectionDoc) => {
    const sectionHtml = sectionDoc.convert();
    const slidesNode = dom.select('.slides');
    slidesNode
      .insertAdjacentHTML('beforeend', sectionHtml);
    if (sectionHtml.includes('sect2')) { // Has subsections
      const topLevelSectionAsDiv = dom.select('div.sect1');
      const subSectionsAsDivs = dom.selectAll('div.sect2');

      // Cleanup
      slidesNode.removeChild(topLevelSectionAsDiv);
      subSectionsAsDivs.forEach((subSectionAsDiv) => removeFromParent(subSectionAsDiv));

      // Create wrapping section
      const wrappingSection = dom.newElement('section');
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
function embedImages (dom, { ast, inputFolder }) {
  const images = ast.getImages()
    .reduce(
      (seed, image) => {
        const name = image.getTarget();
        const imageRelativePath = join(image.getImagesDirectory(), name);
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
          logError(_`Cannot embed image ${name} at ${imageAbsolutePath} >> ${error.message}`({ nodes: [ theme.strong, theme.strong, undefined ] }));
          return seed;
        }
      },
      {},
    );

  const badImageTypes = Object.values(images)
    .map(({ type }) => type)
    .filter((type) => !Object.values(PREFERRED_IMAGE_TYPES).includes(type));
  if (badImageTypes.length) {
    const bad = badImageTypes.join(', ');
    const good = Object.values(PREFERRED_IMAGE_TYPES).join(', ');
    logWarn(_`Your deck contains inefficient image types [ ${bad} ], consider using [ ${good} ] instead`({ nodes: [ theme.error, theme.success ] }));
  }

  const css = Object.values(images)
    .reduce((seed, image) => `${seed} .${image.cssClass} { display: inline-block; background-size: cover; background-image: url('${image.dataUri}'); }`, '');

  dom.selectAll('.image,.imageblock')
    .forEach((parentNode) => {
      const imgNode = parentNode.querySelector('img');
      const imageName = getBaseName(imgNode.src);
      const image = images[ imageName ];

      if (!image) { return parentNode.innerHTML = `<span>Image "${imageName}" not found</span>`; }

      const style = parentNode.classList.contains('thumb')
        ? 'width: 1em; height: 1em; vertical-align: text-bottom;'
        : `width: ${imgNode.width}px; height: ${imgNode.height}px`;
      const additionalClasses = [ ...parentNode.classList ];
      const newElement = dom.newElement('span', [ image.cssClass, ...additionalClasses ], { style, role: 'image' });
      const grandParentNode = parentNode.parentNode;
      grandParentNode.replaceChild(newElement, parentNode);
    });

  dom.insertInlineStyle('IMAGES', css);

  return dom;
}

function createEmojiCss (emoji) {
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
async function embedEmojis (dom, { emojisRegister }) {
  await Promise.all( // Wait for all HTTP calls to end and all SVGs to be on disk
    Object.values(emojisRegister)
      .map(({ fetcher }) => fetcher),
  );

  const emojis = Object.entries(emojisRegister)
    .filter(([ , metadata ]) => existsSync(metadata.filePath)) // Sometimes, HTTP GET failed, let's avoid breaking watcher in that case
    .map(([ name, metadata ]) => ({ name, cssClass: metadata.cssClass, dataUri: readFileToDataUri('svg', metadata.filePath) }))
    .reduce((seed, emoji) => ({ ...seed, [ emoji.name ]: emoji }), {});

  const css = Object.values(emojis)
    .reduce((seed, emoji) => `${seed} ${createEmojiCss(emoji)}`, '');
  dom.insertInlineStyle('EMOJIS', css);

  dom.selectAll('.emoji')
    .forEach((parentNode) => {
      const imgNode = parentNode.querySelector('img');
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
function fixupCodeBlocks (dom, { ast }) {
  const state = {
    codeBlockIndex: 0,
    multilineCodeBlocks: dom.selectAll('.keep-markup pre code'),
  };
  processBlocksRecursively(
    ast,
    (block) => {
      const shouldBeFixed = block.content_model === 'verbatim' && block?.getAttribute('role')?.includes('keep-markup');
      if (!shouldBeFixed) { return; }
      const correspondingHtmlCodeBlock = state.multilineCodeBlocks[ state.codeBlockIndex++ ];
      correspondingHtmlCodeBlock.innerHTML = block.getSource();
    },
  );

  return dom;
}

function extractSpeakerNotes (dom) {
  dom.selectAll('.notes')
    .forEach((notesNode) => dom.changeElementTag(notesNode, 'aside'));
  return dom;
}

function toSvgDataUri (content) {
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

export function readFileToDataUri (type, filePath) {
  if (!existsSync(filePath)) {
    throw Error(`File not found`);
  }

  if (statSync(filePath).isDirectory()) {
    throw Error(`Found folder instead of file`);
  }

  switch (type) {
    case SUPPORTED_IMAGE_TYPES.SVG:
      return readTextFileSync(filePath, (content) => toSvgDataUri(content));
    case SUPPORTED_IMAGE_TYPES.PNG:
    case SUPPORTED_IMAGE_TYPES.JXL:
    case SUPPORTED_IMAGE_TYPES.AVIF:
    case SUPPORTED_IMAGE_TYPES.WEBP:
      return `data:image/${type};base64,${readAsBase64Sync(filePath)}`;
    default:
      const supportedFileTypesMessage = Object.values(SUPPORTED_IMAGE_TYPES).join(', ');
      throw Error(_`Unsupported image type: ${type}, try any of [${supportedFileTypesMessage}]`({ nodes: [ theme.error ] }));
  }
}
