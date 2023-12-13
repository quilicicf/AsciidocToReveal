// noinspection JSUnusedGlobalSymbols

import { DEFAULT_DARK_HIGHLIGHT_THEME, DEFAULT_LIGHT_HIGHLIGHT_THEME, HIGHLIGHT_THEMES } from '../../code/highlightCode.mjs';
import { DEFAULT_COLOR, DEFAULT_THEME, THEMES } from '../../themes/applyTheme.mjs';
import { sanitize } from '../../third-party/dom/api.mjs';
import { existsSync, statSync } from '../../third-party/fs/api.mjs';
import { _, logError, logWarn, theme } from '../../third-party/logger/log.mjs';
import { join } from '../../third-party/path/api.mjs';

const PATH_VALIDATORS = {
  FILE (absolutePath, name) {
    if (!statSync(absolutePath).isFile()) {
      logWarn(_`Expected a file for ${name}, got a folder instead`({ nodes: [ theme.strong ] }));
      return undefined;
    }
    return absolutePath;
  },
  FOLDER (absolutePath, name) {
    if (!statSync(absolutePath).isDirectory()) {
      logWarn(_`Expected a folder for ${name}, got a file instead`({ nodes: [ theme.strong ] }));
      return undefined;
    }
    return absolutePath;
  },
};

export const deckConfiguration = {
  customJs: {
    id: 'a2r-js',
    documentation: `Specify a path to a custom JS file that will be the last loaded script in the final deck`,
    defaultValue: '',
    acceptedValues: `Path relative to the deck's input file`,
    validate (value, inputFolder) {
      return validateCustomPath(value, 'custom JS', inputFolder, PATH_VALIDATORS.FILE);
    },
  },
  customCss: {
    id: 'a2r-css',
    documentation: `Specify a path to a custom CSS file that will be the last loaded style in the final deck`,
    defaultValue: '',
    acceptedValues: `Path relative to the deck's input file`,
    validate (value, inputFolder) {
      return validateCustomPath(value, 'custom CSS', inputFolder, PATH_VALIDATORS.FILE);
    },
  },
  favicon: {
    id: 'a2r-favicon',
    documentation: `Specify a path to the file containing your favicon`,
    defaultValue: '',
    acceptedValues: `Path relative to the deck's input file`,
    validate (value, inputFolder) {
      return validateCustomPath(value, 'favicon', inputFolder, PATH_VALIDATORS.FILE);
    },
  },
  svgIconsFolder: {
    id: 'a2r-svg-icons-dir',
    documentation: `Specify the location of the folder containing your SVG icons`,
    defaultValue: '',
    acceptedValues: `Path relative to the deck's input file`,
    validate (value, inputFolder) {
      return validateCustomPath(value, 'SVG icons directory', inputFolder, PATH_VALIDATORS.FOLDER);
    },
  },
  pageTitle: {
    id: 'a2r-page-title',
    documentation: `Specify the HTML title for the deck`,
    defaultValue: `First slide's title`,
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
  themeColor: {
    id: 'a2r-theme-color',
    documentation: `The theme\'s accent color`,
    defaultValue: DEFAULT_COLOR,
    acceptedValues: 'oklch as JSON, ex: [ .6, .1, 170 ]',
    validate (value) {
      if (value === undefined) { return this.defaultValue; }

      try {
        JSON.parse(value);
      } catch (error) {
        logWarn(_`The theme color ${value} is not valid JSON`({ nodes: [ theme.error ] }));
        return this.defaultValue;
      }

      const [ lightString = undefined, chromaString = undefined, hueString = undefined ] = JSON.parse(value);

      try {
        const light = validateNumber(lightString, 'theme color light', 0, 1);
        const chroma = validateNumber(chromaString, 'theme color chroma', 0, .37);
        const hue = validateNumber(hueString, 'theme color hue', 0, 360);
        return [ light, chroma, hue ];
      } catch (error) {
        logWarn(error.message);
        return this.defaultValue;
      }
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
      },
      {},
    );

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

function validateCustomPath (value, name, inputFolder, typeValidator) {
  if (value === undefined) { return undefined; }
  if (value.includes('..')) {
    logError(_`Cannot load ${name} ${value}, path must be relative to the deck's location without back-tracking`({
      nodes: [ undefined, theme.strong ],
    }));
    return undefined;
  }

  const absolutePath = join(inputFolder, value);
  if (!existsSync(absolutePath)) {
    logWarn(_`Cannot load ${name} ${value}, file not found`({ nodes: [ undefined, theme.strong ] }));
    return undefined;
  }

  return typeValidator(absolutePath, name);
}

function validateEnumValue (value, name, acceptedValues, defaultValue) {
  if (value === undefined) { return defaultValue; }
  if (!acceptedValues.includes(value)) {
    logWarn(_`Invalid value ${value} for ${name}, accepted values are [ ${acceptedValues.join(', ')} ]. Using default value ${defaultValue} instead`({
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
      logWarn(_`Invalid value ${value} for ${name}, not fragmenting`({ nodes: [ theme.strong, undefined ] }));
      return defaultValue;
  }
}

function validateNumber (numberAsString, name, min, max) {
  if (isNaN(numberAsString)) {
    throw Error(_`The provided ${name}, must be a number, got ${numberAsString}`({ nodes: [ theme.strong, theme.error ] }));
  }

  const number = parseFloat(numberAsString);
  if (number < min || number > max) {
    throw Error(_`The provided ${name} should be in range [ ${min}, ${max} ], got ${number}`({
      nodes: [ theme.strong, theme.success, theme.success, theme.error ],
    }));
  }

  return number;
}
