import jsdom from 'jsdom';

export const INSERT_POSITIONS = {
  BEFORE_END: 'beforeend',
  AFTER_BEGIN: 'afterbegin',
};

/**
 * Takes HTML source code and parses it to a DOM
 *
 * @param source {string}
 * @returns {A2R.Dom}
 */
export function toDom (source) {
  const delegate = new jsdom.JSDOM(source);

  return {
    delegate,
    window: delegate.window,
    document: delegate.window.document,
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
      this.select(selector)
        .insertAdjacentHTML(position, html);
    },
    insertInlineStyle (styleId, styleContent, stylePosition = INSERT_POSITIONS.BEFORE_END) {
      this.select('head')
        .insertAdjacentHTML(stylePosition, `<style id="${styleId}">${styleContent}</style>`);
    },
    insertInlineScript (scriptId, scriptContent, scriptPosition = INSERT_POSITIONS.BEFORE_END) {
      this.select('body')
        .insertAdjacentHTML(scriptPosition, `<script id="${scriptId}" type="module">${scriptContent}</script>`);
    },
    toHtml () {
      return this.delegate.serialize();
    },
  };
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
