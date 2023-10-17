import { readAsBase64Sync, readTextFileSync } from './third-party/fs/api.mjs';

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
  [ ...element.classList.values() ]
    .forEach((className) => newElement.classList.add(className));
  element.parentNode.replaceChild(newElement, element);
}

export function removeFromParent (element) {
  element.parentNode.removeChild(element);
}

export function replaceInParent (element, newElement) {
  element.parentNode.replaceChild(newElement, element);
}

function toSvgDataUri (content) {
  const imageText = content
    .replaceAll(/width="[^"]+"/g, '')
    .replaceAll(/height="[^"]+"/g, '')
    .replaceAll('?', '%3F')
    .replaceAll('#', '%23')
    .replaceAll('\n', '')
    .replaceAll(/\s+/g, ' ');
  return `data:image/svg+xml,${imageText}`;
}

export function readFileToDataUri (type, filePath) {
  switch (type) {
    case 'svg':
      return readTextFileSync(filePath, (content) => toSvgDataUri(content));
    case 'png':
      return `data:image/${type};base64,${readAsBase64Sync(filePath)}`;
    default:
      throw Error(`Unsupported image type: ${type}`);
  }
}

export function insertInlineStyle (dom, styleId, styleContent, stylePosition = 'beforeend') {
  $(dom, 'head')
    .insertAdjacentHTML(stylePosition, `<style id="${styleId}">${styleContent}</style>`);
}

export function insertInlineScript (dom, scriptId, scriptContent, scriptPosition = 'beforeend') {
  $(dom, 'body')
    .insertAdjacentHTML(scriptPosition, `<script id="${scriptId}" type="module">${scriptContent}</script>`);
}


export function sanitize (text) {
  return text
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
