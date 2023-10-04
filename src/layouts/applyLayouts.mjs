import { $, insertInlineStyle } from '../domUtils.mjs';

const LAYOUTS = {
  'layout-columns': `
    .layout-columns > .content {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      grid-column-gap: 1em;
      grid-row-gap: 1em;
    }
      
    .layout-columns .column-1x  { grid-column: span 1;  }
    .layout-columns .column-2x  { grid-column: span 2;  }
    .layout-columns .column-3x  { grid-column: span 3;  }
    .layout-columns .column-4x  { grid-column: span 4;  }
    .layout-columns .column-5x  { grid-column: span 5;  }
    .layout-columns .column-6x  { grid-column: span 6;  }
    .layout-columns .column-7x  { grid-column: span 7;  }
    .layout-columns .column-8x  { grid-column: span 8;  }
    .layout-columns .column-9x  { grid-column: span 9;  }
    .layout-columns .column-10x { grid-column: span 10; }
    .layout-columns .column-11x { grid-column: span 11; }
    .layout-columns .column-12x { grid-column: span 12; }
  `, // FIXME: use CSS nesting when jsdom supports it
};

export default function applyLayouts (dom) {
  const cssToInject = Object.entries(LAYOUTS)
    .filter(([ cssClass ]) => !!$(dom, `.${cssClass}`))
    .reduce((seed, [ , cssContent ]) => `${seed}${cssContent}`, '');

  if (!cssToInject) { return dom; }
  insertInlineStyle(dom, 'LAYOUTS', cssToInject);

  return dom;
}
