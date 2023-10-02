import { readFileSync } from 'fs';

import readAsBase64 from './readAsBase64.mjs';

export function $ (dom, selector) {
  return dom.window.document.querySelector(selector);
}

export function $$ (dom, selector) {
  return [ ...dom.window.document.querySelectorAll(selector) ];
}

export function createNewElement (dom, tag, classes = [], attributes = {}) {
  const element = dom.window.document.createElement(tag);
  element.classList.add(...classes);
  Object.entries(attributes)
    .forEach(([ key, value ]) => element.setAttribute(key, value));
  return element;
}

export function changeElementTag (dom, element, newTag) {
  const newElement = dom.window.document.createElement(newTag);
  newElement.innerHTML = element.innerHTML;
  element.parentNode.replaceChild(newElement, element);
}

export function removeFromParent (element) {
  element.parentNode.removeChild(element);
}

export function readFileToDataUri (type, filePath) {
  switch (type) {
    case 'svg':
      const imageText = readFileSync(filePath, 'utf8')
        .replaceAll(/width="[^"]+"/g, '')
        .replaceAll(/height="[^"]+"/g, '')
        .replaceAll('?', '%3F')
        .replaceAll('#', '%23')
        .replaceAll('\n', '')
        .replaceAll(/\s+/g, ' ');
      return `data:image/svg+xml,${imageText}`;
    case 'png':
      const imageBase64 = readAsBase64(filePath);
      return `data:image/${type};base64,${imageBase64}`;
    default:
      throw Error(`Unsupported image type: ${type}`);
  }
}
