import jsdom from 'npm:jsdom';
import { Dom } from '../../domain/api.ts';

/**
 * Takes HTML source code and parses it to a DOM
 */
export function toDom (source: string): Dom {
  const delegate = new jsdom.JSDOM(source);

  return {
    getWindow () {
      return delegate.window;
    },
    getDocument () {
      return delegate.window.document;
    },

    select (selector: string): Element | null {
      return this.getDocument().querySelector(selector);
    },
    selectAll (selector: string): Element[] {
      return Array.from(this.getDocument().querySelectorAll(selector));
    },
    newElement (tag: string, classes: string[] = [], attributes: Record<string, string> = {}, content?: string): Element {
      const element: HTMLElement = this.getDocument().createElement(tag);
      element.classList.add(...classes);
      Object.entries(attributes)
        .forEach(([ key, value ]) => element.setAttribute(key, value));
      if (content) {
        element.insertAdjacentHTML('afterbegin', content);
      }
      return element;
    },
    changeElementTag (element: Element, newTag: string): void {
      const newElement = this.getDocument().createElement(newTag);
      newElement.innerHTML = element.innerHTML;
      Array.from(element.classList)
        .forEach((className) => newElement.classList.add(className));
      element.parentNode?.replaceChild(newElement, element);
    },
    insertHtml (selector: string, html: string, position: InsertPosition = 'beforeend') {
      this.select(selector)
        ?.insertAdjacentHTML(position, html);
    },
    insertInlineStyle (styleId: string, styleContent: string, stylePosition: InsertPosition = 'beforeend') {
      this.select('head')
        ?.insertAdjacentHTML(stylePosition, `<style id="${styleId}">${styleContent}</style>`);
    },
    insertInlineScript (scriptId: string, scriptContent: string, scriptPosition: InsertPosition = 'beforeend') {
      this.select('body')
        ?.insertAdjacentHTML(scriptPosition, `<script id="${scriptId}" type="module">${scriptContent}</script>`);
    },
    toHtml () {
      return delegate.serialize();
    },
  };
}

export function replaceInParent (element: Element, newElement: Element): void {
  element.parentNode?.replaceChild(newElement, element);
}

export function removeFromParent (element: Element): void {
  element.parentNode?.removeChild(element);
}

export function findParentRecursively (element: Element, predicate: (element: Element) => boolean): Element | null {
  const parent = element.parentElement;
  if (!parent) { return null; }
  if (predicate(parent)) { return parent; }
  return findParentRecursively(parent, predicate);
}

export function sanitize (text: string): string {
  return text
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
