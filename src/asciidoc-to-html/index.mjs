import jsdom from 'jsdom';
import Processor from '@asciidoctor/core';
import RevealJsPlugin from '@asciidoctor/reveal.js';
import { basename, dirname, extname, join, resolve } from 'path';
import { writeFileSync } from 'fs';

import { $, $$, changeElementTag, createNewElement, readFileToDataUri, removeFromParent } from '../domUtils.mjs';
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

export function asciidocToHtml (inputPath) {
  const inputFolder = dirname(inputPath);
  const processor = new Processor();
  RevealJsPlugin.register();
  const document = processor.loadFile(inputPath, { catalog_assets: true });
  const html = processor.convertFile(inputPath, { standalone: true, backend: 'html', to_file: false });
  writeFileSync('/tmp/deck.html', html, 'utf8');

  const baseDom = new jsdom.JSDOM(BASE_HTML);
  return [
    insertTitleSection,
    insertOtherSections,
    embedImages,
    fixupCodeBlocks,
  ].reduce((seed, operation) => operation(document, seed, inputFolder), baseDom);
}

/**
 * Takes the header of the asciidoc file and creates a title section for it.
 */
function insertTitleSection (document, dom) {
  const titleDoc = document.getDocumentTitle();
  $(dom, 'h1')
    .insertAdjacentHTML('beforeend', titleDoc);

  const titleText = $(dom, 'h1')
    .textContent
    .trim();
  $(dom, 'head title')
    .insertAdjacentText('beforeend', titleText);

  const preambleDoc = document.blocks[ 0 ];
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
function insertOtherSections (document, dom) {
  const [ , ...nonTitleSectionDocs ] = document.blocks;
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
 * This allows embedding all images in the HTML file without repeating images multiple times.
 */
function embedImages (document, dom, inputFolder) {
  const images = document.getImages()
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
    console.warn(`Your presentation contains images of inefficient types: [ ${badImageTypes} ]`);
    console.warn(`Please consider only using more performant types: [ ${preferredImageTypes} ]`);
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

  $(dom, 'head')
    .insertAdjacentHTML('beforeend', `<style id="CSS_IMAGES">${IMAGES_CSS}${css}</style>`);

  return dom;
}

/**
 * Asciidoctor wrongfully escapes HTML characters in the code blocks.
 * This breaks the keep markup PrismJS plugin which allows showing code fragment per fragment.
 * This method read the real code from the original asciidoc file and fixes the code blocks in the HTML.
 */
function fixupCodeBlocks (document, dom) {
  const state = { codeBlockIndex: 0 };
  processBlocksRecursively(
    document,
    (block) => {
      const isSourceCode = block.content_model === 'verbatim';
      const hasHtmlEncodedEntities = [ 'html', 'xhtml', 'xml' ].includes(block.getAttribute('language'));
      if (!isSourceCode) {
        return;
      } else if (hasHtmlEncodedEntities) {
        state.codeBlockIndex++; // Otherwise... oopsie!
        return;
      }
      const correspondingHtmlCodeBlock = $$(dom, 'code')[ state.codeBlockIndex++ ];
      correspondingHtmlCodeBlock.innerHTML = block.getSource();
    },
  );

  return dom;
}
