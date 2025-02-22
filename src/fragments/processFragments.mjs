/**
 * @param baseDom {A2R.Dom}
 * @param deck {A2R.Deck}
 * @returns {A2R.Dom}
 */
export default function processFragments (baseDom, deck) {
  /** @type {A2R.DomTransformer} */
  const transformers = [
    fragmentLists,
    fragmentTables,
    indexDeckFragments,
  ];
  return transformers.reduce((dom, operation) => operation(dom, deck), baseDom);
}

/**
 * @param dom {A2R.Dom}
 * @param deck {A2R.Deck}
 * @returns {A2R.Dom}
 */
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

/**
 * @param dom {A2R.Dom}
 * @param deck {A2R.Deck}
 * @returns {A2R.Dom}
 */
function fragmentTables (dom, { configuration }) {
  if (!configuration.shouldFragmentTables) { return dom; }

  dom.selectAll('tbody > tr')
    .filter((tableRowNode) => !isInNotes(tableRowNode))
    .forEach((tableRowNode) => tableRowNode.classList.add('fragment'));

  return dom;
}

/**
 * @param dom {A2R.Dom}
 * @returns {A2R.Dom}
 */
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
