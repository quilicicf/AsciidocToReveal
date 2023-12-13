export default function processFragments (initialDom, deck) {
  return [
    fragmentLists,
    fragmentTables,
    indexDeckFragments,
  ].reduce((dom, operation) => operation(dom, deck), initialDom);
}

function fragmentLists (dom, { configuration }) {
  if (!configuration.shouldFragmentLists) { return dom; }

  dom.selectAll('ul li')
    .filter((listItemNode) => !isInNotes(listItemNode))
    .forEach((listItemNode) => {
      listItemNode.classList.add('fragment');
      const hasChildrenItems = !![ ...listItemNode.querySelectorAll('li') ].length;
      if (hasChildrenItems) {
        listItemNode.classList.add('list-item-with-children');
      }
    });

  return dom;
}

function fragmentTables (dom, { configuration }) {
  if (!configuration.shouldFragmentTables) { return dom; }

  dom.selectAll('tbody > tr')
    .filter((tableRowNode) => !isInNotes(tableRowNode))
    .forEach((tableRowNode) => tableRowNode.classList.add('fragment'));

  return dom;
}

function indexDeckFragments (dom) {
  dom.selectAll('section.auto-fragments-first')
    .filter((slideNode) => slideNode.querySelector('*[data-fragment-index]'))
    .forEach((slideNode) => indexSlideFragments(slideNode));

  return dom;
}

function indexSlideFragments (slideNode) {
  [ ...slideNode.querySelectorAll('.fragment') ]
    .filter((fragment) => !fragment.getAttribute('data-fragment-index'))
    .forEach((unIndexedFragment, index) => unIndexedFragment.setAttribute('data-fragment-index', index));
}


function isInNotes (node) {
  if (node.tagName === 'SECTION') {
    return false;
  } else if (node.tagName === 'ASIDE' && node.classList.contains('notes')) {
    return true;
  } else {
    return isInNotes(node.parentNode);
  }
}
