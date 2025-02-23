import { Dom } from '../domain/api.ts';

const LAYOUTS: Record<string, string> = {
  'layout-columns': `
    .layout-columns > .content {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      align-items: center;
    }
    
    .layout-columns div[class*='column-'] {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    .layout-columns div[class*='column-']:not(:last-child) {
      padding-right: 1rem;
      border-radius: .1rem;
      border-right: calc(var(--a2r-border-size) / 1.5) solid var(--a2r-color-border);
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
  `, // FIXME: use CSS nesting when 3rd-party DOM lib supports it
};

export default function applyLayouts (dom: Dom): Dom {
  const cssToInject = Object.entries(LAYOUTS)
    .filter(([ cssClass ]) => !!dom.select(`.${cssClass}`))
    .reduce((seed, [ , cssContent ]) => `${seed}${cssContent}`, '');

  if (!cssToInject) { return dom; }
  dom.insertInlineStyle('LAYOUTS', cssToInject);

  return dom;
}
