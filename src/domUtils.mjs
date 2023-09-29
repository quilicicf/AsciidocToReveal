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
