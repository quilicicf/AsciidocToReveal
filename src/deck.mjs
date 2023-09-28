import Reveal from 'reveal.js/dist/reveal.esm.js';
import NotesPlugin from 'reveal.js/plugin/notes/notes.esm.js';

import 'reveal.js/dist/reset.css';
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/blood.css';

const urlParams = new URLSearchParams(window.location.search);

function castQueryParameter (name) {
  const rawValue = urlParams.get(name);
  if (rawValue === 'true') { return true; }
  if (rawValue === 'false') { return false; }
  if (/^[0-9]+$/.test(rawValue)) { return parseInt(rawValue, 10); }
  if (!rawValue) { return undefined; }
  return rawValue;
}

const overwriteFromQuery = (options) => Object.entries(options)
  .reduce((seed, [ key, defaultValue ]) => ({ ...seed, [ key ]: castQueryParameter(key) || defaultValue }), {});

const initOptions = overwriteFromQuery({
  controlsTutorial: false,
  slideNumber: (slide) => { // TODO: find why value 'c/t' does not work anymore
    if (!slide) { return ''; }
    const allSlides = [ ...document.querySelectorAll('section') ]
      .filter((section) => section.querySelectorAll('section').length === 0);
    return [ allSlides.indexOf(slide) + 1, '/', allSlides.length ];
  },
  hash: true,
  defaultTiming: 120,
  width: 1920,
  height: 1080,
  fragments: true,
  transition: 'none',
  backgroundTransition: 'none',
  pdfSeparateFragments: false,
  showNotes: false,
  plugins: [ NotesPlugin ],
});

Reveal.initialize(initOptions);

document.querySelectorAll('.fragment:not(.no-fade):not(.fade-in)')
  .forEach((node) => node.classList.add('fade-in-then-semi-out'));

window.Reveal = Reveal;
