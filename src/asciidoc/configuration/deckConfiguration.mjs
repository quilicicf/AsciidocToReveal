import { existsSync } from 'fs';
import { join } from 'path';
import { stoyle } from 'stoyle';

import { DEFAULT_DARK_HIGHLIGHT_THEME, DEFAULT_LIGHT_HIGHLIGHT_THEME, HIGHLIGHT_THEMES } from '../../code/highlightCode.mjs';
import { sanitize } from '../../domUtils.mjs';
import { logError, logWarn, theme } from '../../log.mjs';
import { CHROMA_LEVELS, DEFAULT_CHROMA_LEVEL, DEFAULT_HUE, DEFAULT_THEME, THEMES } from '../../themes/applyTheme.mjs';

export const deckConfiguration = {
  customJs: {
    id: 'a2r-js',
    documentation: ``,
    validate (value, inputFolder) {
      return validateCustomFilePath(value, 'custom JS', inputFolder);
    },
  },
  customCss: {
    id: 'a2r-css',
    documentation: ``,
    validate (value, inputFolder) {
      return validateCustomFilePath(value, 'custom CSS', inputFolder);
    },
  },
  favicon: {
    id: 'a2r-favicon',
    documentation: ``,
    validate (value, inputFolder) {
      return validateCustomFilePath(value, 'favicon', inputFolder);
    },
  },
  pageTitle: {
    id: 'a2r-page-title',
    documentation: ``,
    validate (value) {
      return sanitize(value);
    },
  },
  shouldFragmentLists: {
    id: 'a2r-fragment-lists',
    documentation: ``,
    validate (value) {
      switch (value) {
        case 'true':
          return true;
        case 'false':
          return false;
        case undefined:
          return false;
        default:
          logWarn(stoyle`Invalid value ${value} for list fragmentation, not fragmenting`({ nodes: [ theme.strong ] }));
          return false;
      }
    },
  },

  themeName: {
    id: 'a2r-theme-name',
    documentation: ``,
    validate (value) {
      return validateEnumValue(value, 'theme name', Object.values(THEMES), DEFAULT_THEME);
    },
  },
  themeHue: {
    id: 'a2r-theme-hue',
    documentation: ``,
    validate (value) {
      if (value === undefined) { return DEFAULT_HUE; }
      if (0 <= value && value <= 360) { return value; }

      logWarn(stoyle`Invalid theme hue ${value}, must be in range [ ${0}, ${360} ]. Using default hue ${DEFAULT_HUE} instead`({
        nodes: [ theme.error, theme.success, theme.success, theme.info ],
      }));
      return DEFAULT_HUE;
    },
  },
  themeChromaLevel: {
    id: 'a2r-theme-chroma-level',
    documentation: ``,
    validate (value) {
      return validateEnumValue(value, 'theme chroma level', Object.keys(CHROMA_LEVELS), DEFAULT_CHROMA_LEVEL);
    },
  },
  highlightThemeDark: {
    id: 'a2r-highlight-theme-dark',
    documentation: ``,
    validate (value) {
      return validateEnumValue(value, 'dark highlight theme', Object.keys(HIGHLIGHT_THEMES), DEFAULT_DARK_HIGHLIGHT_THEME);
    },
  },
  highlightThemeLight: {
    id: 'a2r-highlight-theme-light',
    documentation: ``,
    validate (value) {
      return validateEnumValue(value, 'light highlight theme', Object.keys(HIGHLIGHT_THEMES), DEFAULT_LIGHT_HIGHLIGHT_THEME);
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
