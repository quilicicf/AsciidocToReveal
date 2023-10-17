import { stoyle } from 'stoyle';

import { DEFAULT_DARK_HIGHLIGHT_THEME, DEFAULT_LIGHT_HIGHLIGHT_THEME, HIGHLIGHT_THEMES } from '../../code/highlightCode.mjs';
import { sanitize } from '../../domUtils.mjs';
import { existsSync } from '../../third-party/fs/api.mjs';
import { logError, logWarn, theme } from '../../log.mjs';
import { CHROMA_LEVELS, DEFAULT_CHROMA_LEVEL, DEFAULT_HUE, DEFAULT_THEME, THEMES } from '../../themes/applyTheme.mjs';
import { join } from '../../third-party/path/api.mjs';

export const deckConfiguration = {
  customJs: {
    id: 'a2r-js',
    documentation: `Specify a path to a custom JS file that will be the last loaded script in the final deck`,
    defaultValue: '',
    acceptedValues: 'Path relative to the deck\'s input file',
    validate (value, inputFolder) {
      return validateCustomFilePath(value, 'custom JS', inputFolder);
    },
  },
  customCss: {
    id: 'a2r-css',
    documentation: `Specify a path to a custom CSS file that will be the last loaded style in the final deck`,
    defaultValue: '',
    acceptedValues: 'Path relative to the deck\'s input file',
    validate (value, inputFolder) {
      return validateCustomFilePath(value, 'custom CSS', inputFolder);
    },
  },
  favicon: {
    id: 'a2r-favicon',
    documentation: `Specify a path to the file containing your favicon`,
    defaultValue: '',
    acceptedValues: 'Path relative to the deck\'s input file',
    validate (value, inputFolder) {
      return validateCustomFilePath(value, 'favicon', inputFolder);
    },
  },
  pageTitle: {
    id: 'a2r-page-title',
    documentation: `Specify the HTML title for the deck`,
    defaultValue: 'First slide\'s title',
    acceptedValues: 'Any string',
    validate (value) {
      return value === undefined ? undefined : sanitize(value);
    },
  },
  shouldFragmentLists: {
    id: 'a2r-fragment-lists',
    documentation: `Make all lists in the deck Reveal.js fragments`,
    defaultValue: false,
    acceptedValues: 'booleans',
    validate (value) {
      return validateBoolean(value, 'list fragmentation', this.defaultValue);
    },
  },
  shouldFragmentTables: {
    id: 'a2r-fragment-tables',
    documentation: `Make all tables in the deck Reveal.js fragments`,
    defaultValue: false,
    acceptedValues: 'booleans',
    validate (value) {
      return validateBoolean(value, 'table fragmentation', this.defaultValue);
    },
  },

  themeName: {
    id: 'a2r-theme-name',
    documentation: `Select the theme to use`,
    defaultValue: DEFAULT_THEME,
    acceptedValues: Object.values(THEMES),
    validate (value) {
      return validateEnumValue(value, 'theme name', this.acceptedValues, this.defaultValue);
    },
  },
  themeHue: {
    id: 'a2r-theme-hue',
    documentation: `The hue of the accent color`,
    defaultValue: DEFAULT_HUE,
    acceptedValues: '0 <= x <= 360',
    validate (value) {
      if (value === undefined) { return this.defaultValue; }
      if (0 <= value && value <= 360) { return value; }

      logWarn(stoyle`Invalid theme hue ${value}, must be in range [ ${0}, ${360} ]. Using default hue ${this.defaultValue} instead`({
        nodes: [ theme.error, theme.success, theme.success, theme.info ],
      }));
      return this.defaultValue;
    },
  },
  themeChromaLevel: {
    id: 'a2r-theme-chroma-level',
    documentation: `The chroma level of the accent color`,
    defaultValue: DEFAULT_CHROMA_LEVEL,
    acceptedValues: Object.keys(CHROMA_LEVELS),
    validate (value) {
      return validateEnumValue(value, 'theme chroma level', this.acceptedValues, this.defaultValue);
    },
  },
  highlightThemeDark: {
    id: 'a2r-highlight-theme-dark',
    documentation: 'The theme for syntax coloration in dark mode',
    defaultValue: DEFAULT_DARK_HIGHLIGHT_THEME,
    acceptedValues: Object.keys(HIGHLIGHT_THEMES).sort(),
    validate (value) {
      return validateEnumValue(value, 'dark highlight theme', this.acceptedValues, this.defaultValue);
    },
  },
  highlightThemeLight: {
    id: 'a2r-highlight-theme-light',
    documentation: 'The theme for syntax coloration in light mode',
    defaultValue: DEFAULT_LIGHT_HIGHLIGHT_THEME,
    acceptedValues: 'Same as for dark mode',
    validate (value) {
      return validateEnumValue(value, 'light highlight theme', Object.keys(HIGHLIGHT_THEMES), this.defaultValue);
    },
  },
};


export function parseConfiguration (ast, inputFolder) {
  const baseConfiguration = Object.entries(deckConfiguration)
    .reduce((seed, [ optionName, optionConfiguration ]) => {
      const value = ast.getAttribute(optionConfiguration.id);
      return {
        ...seed,
        [ optionName ]: optionConfiguration.validate(value, inputFolder),
      };
    });

  const themeSwitchingMode = baseConfiguration.themeName.endsWith(('-manual')) ? 'manual' : 'auto';
  const startingThemeName = baseConfiguration.themeName.split('-')[ 0 ];
  const nonStartingThemeName = startingThemeName === 'dark' ? 'light' : 'dark';

  return {
    ...baseConfiguration,

    startingThemeName,
    nonStartingThemeName,
    themeSwitchingMode,
  };
}

function validateCustomFilePath (value, name, inputFolder) {
  if (value === undefined) { return undefined; }
  if (value.includes('..')) {
    logError(stoyle`Cannot load ${name} ${value}, path must be relative to the deck's location without back-tracking`({
      nodes: [ undefined, theme.strong ],
    }));
    return undefined;
  }

  const absolutePath = join(inputFolder, value);
  if (!existsSync(absolutePath)) {
    logWarn(stoyle`Cannot load ${name} ${value}, file not found`({ nodes: [ undefined, theme.strong ] }));
    return undefined;
  }

  return absolutePath;
}

function validateEnumValue (value, name, acceptedValues, defaultValue) {
  if (value === undefined) { return defaultValue; }
  if (!acceptedValues.includes(value)) {
    logWarn(stoyle`Invalid value ${value} for ${name}, accepted values are [ ${acceptedValues.join(', ')} ]. Using default value ${defaultValue} instead`({
      nodes: [ theme.error, undefined, theme.success, theme.info ],
    }));
    return defaultValue;
  }

  return value || defaultValue;
}

function validateBoolean (value, name, defaultValue) {
  switch (value) {
    case 'true':
      return true;
    case 'false':
      return false;
    case undefined:
      return defaultValue;
    default:
      logWarn(stoyle`Invalid value ${value} for ${name}, not fragmenting`({ nodes: [ theme.strong, undefined ] }));
      return defaultValue;
  }
}
