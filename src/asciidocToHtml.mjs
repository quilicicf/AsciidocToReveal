import jsdom from 'jsdom';
import Processor from '@asciidoctor/core';
import RevealJsPlugin from '@asciidoctor/reveal.js';
import { $, $$, createNewElement } from './domUtils.mjs';
import { basename, dirname, extname, join, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import readAsBase64 from './readAsBase64.mjs';

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
  .image.thumb span[class^=img-] { width: 1em; height: 1em; vertical-align: text-bottom; }
`;

export function asciidocToHtml (inputPath) {
  const inputFolder = dirname(inputPath);
  const processor = new Processor();
  RevealJsPlugin.register();
  const document = processor.loadFile(inputPath, { catalog_assets: true });
  const html = processor.convertFile(inputPath, { standalone: true, backend: 'html', to_file: false });
  writeFileSync('/tmp/deck.html', html, 'utf8');

  return [
    insertTitleSection,
    inlineImages,
  ].reduce((seed, operation) => operation(document, seed, inputFolder), new jsdom.JSDOM(BASE_HTML));
}

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

function toDataUri (type, path) {
  switch (type) {
    case 'svg':
      const imageText = readFileSync(path, 'utf8')
        .replaceAll(/width="[^"]+"/g, '')
        .replaceAll(/height="[^"]+"/g, '')
        .replaceAll('?', '%3F')
        .replaceAll('#', '%23')
        .replaceAll('\n', '')
        .replaceAll(/\s+/g, ' ');
      return `data:image/svg+xml,${imageText}`;
    case 'png':
      const imageBase64 = readAsBase64(path);
      return `data:image/${type};base64,${imageBase64}`;
    default:
      throw Error(`Unsupported image type: ${type}`);
  }
}

function inlineImages (document, dom, inputFolder) {
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
        const dataUri = toDataUri(type, imageAbsolutePath);
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
    .reduce((seed, image) => `${seed} .${image.cssClass} { display: inline-block; background-size: cover; Pobackground-image: url('${image.dataUri}'); }`, '');

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
