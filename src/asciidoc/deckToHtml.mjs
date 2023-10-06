import { readFileSync } from 'fs';
import jsdom from 'jsdom';
import { basename, extname, join, resolve } from 'path';
import { stoyle } from 'stoyle';

import { $, $$, changeElementTag, createNewElement, insertInlineStyle, readFileToDataUri, removeFromParent, replaceInParent } from '../domUtils.mjs';
import { logWarn } from '../log.mjs';
import theme from '../theme.mjs';
import processBlocksRecursively from './processBlocksRecursively.mjs';

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

const IMAGES_CSS = `
  .image.thumb span[class^=img-] { 
    width: 1em; 
    height: 1em; 
    vertical-align: text-bottom; 
  }
`;

export default function deckToHtml (deck) {
  const baseDom = new jsdom.JSDOM(BASE_HTML);
  return [
    insertFavicon,
    insertTitleSection,
    insertOtherSections,
    embedImages,
    embedEmojis,
    fixupCodeBlocks,
    extractSpeakerNotes,
    fragmentLists,
  ].reduce(
    (promise, operation) => promise.then(async (dom) => operation(dom, deck)),
    Promise.resolve(baseDom),
  );
}

function insertFavicon (dom, { inputFolder, configuration }) {
  const { favicon } = configuration;
  if (favicon) {
    const imageAbsolutePath = resolve(inputFolder, favicon);
    const imageContent = readFileSync(imageAbsolutePath, 'utf8');
    const dataUri = `data:image/svg+xml,${encodeURIComponent(imageContent)}`;
    $(dom, 'head')
      .insertAdjacentHTML('afterbegin', `<link rel="icon" href="${dataUri}"/>`);
  }

  return dom;
}

/**
 * Takes the header of the asciidoc file and creates a title section for it.
 */
function insertTitleSection (dom, { ast, configuration }) {
  const titleDoc = ast.getDocumentTitle();
  $(dom, 'h1')
    .insertAdjacentHTML('beforeend', titleDoc);

  const titleText = configuration.pageTitle || $(dom, 'h1').textContent.trim();
  $(dom, 'head title')
    .insertAdjacentText('beforeend', titleText);

  const preambleDoc = ast.blocks[ 0 ];
  $(dom, '#deck-title')
    .insertAdjacentHTML('beforeend', preambleDoc.convert());

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
    const slidesNode = $(dom, '.slides');
    slidesNode
      .insertAdjacentHTML('beforeend', sectionHtml);
    if (sectionHtml.includes('sect2')) { // Has subsections
      const topLevelSectionAsDiv = $(dom, 'div.sect1');
      const subSectionsAsDivs = $$(dom, 'div.sect2');

      // Cleanup
      slidesNode.removeChild(topLevelSectionAsDiv);
      subSectionsAsDivs.forEach((subSectionAsDiv) => removeFromParent(subSectionAsDiv));

      // Create wrapping section
      const wrappingSection = createNewElement(dom, 'section');
      slidesNode.appendChild(wrappingSection);

      // Re-add sections
      wrappingSection.appendChild(topLevelSectionAsDiv);
      wrappingSection.appendChild(...subSectionsAsDivs);
    }

    $$(dom, 'div.sect1,div.sect2')
      .forEach((sectionAsDiv) => changeElementTag(dom, sectionAsDiv, 'section'));
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
        const extension = extname(name);
        const type = extension.replace(/^\./g, '');
        const id = basename(name, extension);
        const cssClass = `img-${id}`;
        const imageRelativePath = join(image.getImagesDirectory(), name);
        const imageAbsolutePath = resolve(inputFolder, imageRelativePath);
        const dataUri = readFileToDataUri(type, imageAbsolutePath);
        return {
          ...seed,
          [ name ]: { id, cssClass, name, type, dataUri },
        };
      },
      {},
    );

  const preferredImageTypes = [ 'svg', 'webp', 'avif' ];
  const badImageTypes = Object.values(images)
    .map(({ type }) => type)
    .filter((type) => !preferredImageTypes.includes(type));
  if (badImageTypes.length) {
    const bad = badImageTypes.join(', ');
    const good = preferredImageTypes.join(', ');
    logWarn(stoyle`Your deck contains inefficient image types [ ${bad} ], consider using [ ${good} ] instead`({ nodes: [ theme.error, theme.success ] }));
  }

  const css = Object.values(images)
    .reduce((seed, image) => `${seed} .${image.cssClass} { display: inline-block; background-size: cover; background-image: url('${image.dataUri}'); }`, '');

  $$(dom, '.image,.imageblock')
    .forEach((parentNode) => {
      const imgNode = parentNode.querySelector('img');
      const imageName = basename(imgNode.src);
      const image = images[ imageName ];
      const style = [
        ...(imgNode.width ? [ `width: ${imgNode.width}px` ] : []),
        ...(imgNode.height ? [ `height: ${imgNode.height}px` ] : []),
      ].join(';');
      const newElement = createNewElement(dom, 'span', [ image.cssClass ], { style });
      parentNode.innerHTML = '';
      parentNode.appendChild(newElement);
    });

  insertInlineStyle(dom, 'IMAGES', `${IMAGES_CSS}${css}`);

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
  const emojisAsArray = await Promise.all(
    Object.entries(emojisRegister)
      .map(async ([ name, metadata ]) => {
        await metadata.fetcher; // Possibly still calling the server to get the SVG
        return { name, cssClass: metadata.cssClass, dataUri: readFileToDataUri('svg', metadata.filePath) };
      }),
  );
  const emojis = emojisAsArray.reduce((seed, emoji) => ({ ...seed, [ emoji.name ]: emoji }), {});

  const css = emojisAsArray
    .reduce((seed, emoji) => `${seed} ${createEmojiCss(emoji)}`, '');
  insertInlineStyle(dom, 'EMOJIS', css);

  $$(dom, '.emoji')
    .forEach((parentNode) => {
      const imgNode = parentNode.querySelector('img');
      const emojiName = imgNode.alt;
      const cssClass = emojis[ emojiName ].cssClass;
      const style = `width: ${imgNode.getAttribute('width')}; height: ${imgNode.getAttribute('height')}`;
      const newImgNode = createNewElement(dom, 'span', [ cssClass ], { style, role: 'image' });
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
    multilineCodeBlocks: $$(dom, 'pre code'),
  };
  processBlocksRecursively(
    ast,
    (block) => {
      const isSourceCode = block.content_model === 'verbatim';
      const hasHtmlEncodedEntities = [ 'html', 'xhtml', 'xml' ].includes(block.getAttribute('language'));
      if (!isSourceCode) {
        return;
      } else if (hasHtmlEncodedEntities) {
        state.codeBlockIndex++; // Otherwise... oopsie!
        return;
      }
      const correspondingHtmlCodeBlock = state.multilineCodeBlocks[ state.codeBlockIndex++ ];
      correspondingHtmlCodeBlock.innerHTML = block.getSource();
    },
  );

  return dom;
}

function extractSpeakerNotes (dom) {
  $$(dom, '.notes')
    .forEach((notesNode) => changeElementTag(dom, notesNode, 'aside'));
  return dom;
}

function fragmentLists (dom, { configuration }) {
  if (!configuration.shouldFragmentLists) {
    return dom;
  }

  const isInNotes = (node) => {
    if (node.tagName === 'SECTION') {
      return false;
    } else if (node.tagName === 'ASIDE' && node.classList.contains('notes')) {
      return true;
    } else {
      return isInNotes(node.parentNode);
    }
  };

  $$(dom, 'ul li')
    .filter((listItemNode) => !isInNotes(listItemNode))
    .forEach((listItemNode) => listItemNode.classList.add('fragment'));

  return dom;
}
