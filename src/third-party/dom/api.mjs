import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts';

export const INSERT_POSITIONS = {
  BEFORE_END: 'beforeend',
  AFTER_BEGIN: 'afterbegin',
};

export const MIME_TYPES = {
  HTML: 'text/html',
  SVG: 'image/svg+xml',
};

export function toDom (source, mimeType = MIME_TYPES.HTML) {
  const parser = new DOMParser();
  const document = parser.parseFromString(source, mimeType);

  return {
    // window: delegate.window,
    document,
    select (selector) {
      return this.document.querySelector(selector);
    },
    selectAll (selector) {
      return [ ...this.document.querySelectorAll(selector) ];
    },
    newElement (tag, classes = [], attributes = {}) {
      const element = this.document.createElement(tag);
      element.classList.add(...classes);
      Object.entries(attributes)
        .forEach(([ key, value ]) => element.setAttribute(key, value));
      return element;
    },
    changeElementTag (element, newTag) {
      const newElement = this.document.createElement(newTag);
      newElement.innerHTML = element.innerHTML;
      [ ...element.classList.values() ]
        .forEach((className) => newElement.classList.add(className));
      element.parentNode.replaceChild(newElement, element);
    },
    insertHtml (selector, html, position = INSERT_POSITIONS.BEFORE_END) {
      const element = this.select(selector);
      insertHtml(element, html, position);
    },
    insertInlineStyle (id, content, position = INSERT_POSITIONS.BEFORE_END) {
      this.insertHtml('head', `<style id="${id}">${content}</style>`, position);
    },
    insertInlineScript (id, content, position = INSERT_POSITIONS.BEFORE_END) {
      this.insertHtml('body', `<script id="${id}" type="module">${content}</script>`, position);
    },
    toHtml () {
      return this.select('html').outerHTML;
    },
  };
}

export function insertHtml (element, content, position = INSERT_POSITIONS.BEFORE_END) {
  const baseHtml = element.innerHTML;
  switch (position) {
    case INSERT_POSITIONS.BEFORE_END:
      element.innerHTML = `${baseHtml}${content}`;
      break;
    case INSERT_POSITIONS.AFTER_BEGIN:
      element.innerHTML = `${content}${baseHtml}`;
      break;
    default:
      throw Error(`Position ${position} unsupported`);
  }
}

export function replaceInParent (element, newElement) {
  element.parentNode.replaceChild(newElement, element);
}

export function removeFromParent (element) {
  element.parentNode.removeChild(element);
}

export function sanitize (text) {
  return text
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
