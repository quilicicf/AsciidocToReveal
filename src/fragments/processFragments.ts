import { Deck, Dom, SyncDomTransformer } from '../domain/api.ts';

export default function processFragments (baseDom: Dom, deck: Deck): Dom {
  const transformers: SyncDomTransformer[] = [
    fragmentLists,
    fragmentTables,
    indexDeckFragments,
  ];
  return transformers.reduce(
    (dom, transformer) => transformer(dom, deck),
    baseDom as Dom,
  );
}

function fragmentLists (dom: Dom, { configuration }: Deck): Dom {
  if (!configuration.shouldFragmentLists) { return dom; }

  dom.selectAll('ul li')
    .filter((listItemNode) => !isInNotes(listItemNode))
    .forEach((listItemNode) => {
      listItemNode.classList.add('fragment');
      const hasChildrenItems = !!Array.from(listItemNode.querySelectorAll('li')).length;
      if (hasChildrenItems) {
        listItemNode.classList.add('list-item-with-children');
      }
    });

  return dom;
}

function fragmentTables (dom: Dom, { configuration }: Deck): Dom {
  if (!configuration.shouldFragmentTables) { return dom; }

  dom.selectAll('tbody > tr')
    .filter((tableRowNode) => !isInNotes(tableRowNode))
    .forEach((tableRowNode) => tableRowNode.classList.add('fragment'));

  return dom;
}

function indexDeckFragments (dom: Dom): Dom {
  dom.selectAll('section.auto-fragments-first')
    .filter((slideNode) => slideNode.querySelector('*[data-fragment-index]'))
    .forEach((slideNode) => indexSlideFragments(slideNode));

  return dom;
}

function indexSlideFragments (slideNode: Element): void {
  Array.from(slideNode.querySelectorAll('.fragment'))
    .filter((fragment) => !fragment.getAttribute('data-fragment-index'))
    .forEach((unIndexedFragment, index) => unIndexedFragment.setAttribute('data-fragment-index', `${index}`));
}


function isInNotes (node: Element): boolean {
  if (node.tagName === 'SECTION') {
    return false;
  } else if (node.tagName === 'ASIDE' && node.classList.contains('notes')) {
    return true;
  } else {
    return isInNotes(node.parentNode as Element);
  }
}
