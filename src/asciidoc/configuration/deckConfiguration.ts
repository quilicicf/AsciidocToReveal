import {
  DEFAULT_DARK_HIGHLIGHT_THEME,
  DEFAULT_LIGHT_HIGHLIGHT_THEME,
  HIGHLIGHT_THEMES,
} from '../../third-party/code-highlight/api.ts';
import { DEFAULT_COLOR, DEFAULT_THEME, THEMES } from '../../themes/applyTheme.ts';
import { sanitize } from '../../third-party/dom/api.ts';
import { existsSync, statSync } from '../../third-party/fs/api.ts';
import { _, logError, logInfo, logWarn, theme } from '../../third-party/logger/log.ts';
import { join } from '../../third-party/path/api.ts';
import {
  AsciidoctorDocument,
  DeckConfiguration,
  ThemeFamily,
  ThemeName,
  ThemeSwitchingMode, UserSetDeckConfigurationKey,
} from '../../domain/api.ts';

type FsItem = 'FILE' | 'FOLDER';

type PathValidator = (absolutePath: string, name: string) => string | undefined;

const PATH_VALIDATORS: Record<FsItem, PathValidator> = {
  FILE (absolutePath, name) {
    if (!statSync(absolutePath).isFile) {
      logWarn(_`Expected a file for ${name}, got a folder instead`({ nodes: [ theme.strong ] }));
      return undefined;
    }
    return absolutePath;
  },
  FOLDER (absolutePath, name) {
    if (!statSync(absolutePath).isDirectory) {
      logWarn(_`Expected a folder for ${name}, got a file instead`({ nodes: [ theme.strong ] }));
      return undefined;
    }
    return absolutePath;
  },
};

interface OptionBuilder<T> {
  id: string;
  documentation: string;
  defaultValue: T;
  acceptedValues: string;
  validate: (value: string, inputFolder: string, configuration: Partial<DeckConfiguration>) => T | undefined;
}

type DeckConfigurationBuilder = Record<UserSetDeckConfigurationKey, OptionBuilder<unknown>>;

const themeNames = Object.values(THEMES);
const HIGHLIGHT_THEMES_DARK = HIGHLIGHT_THEMES.dark.sort();
const HIGHLIGHT_THEMES_LIGHT = HIGHLIGHT_THEMES.light.sort();

export const deckConfigurationBuilder: DeckConfigurationBuilder = {
  assetsPath: { // NOTE : must be declared first, other keys depend on it
    id: 'a2r-assets',
    documentation: `Specify the path to the folder containing all the external files your deck references`,
    defaultValue: 'The folder `assets` next to the deck file',
    acceptedValues: `Path relative to the deck's input file`,
    validate (value: string, inputFolder: string) {
      const customPath = validateCustomPath(value, 'assets', inputFolder, PATH_VALIDATORS.FILE);
      const assetsPath = customPath || join(inputFolder, 'assets');

      if (customPath) {
        logInfo(_`Assets path ${customPath}`({ nodes: [ theme.strong ] }));
      } else {
        logInfo(_`No defined assets path, using ${assetsPath}`({ nodes: [ theme.strong ] }));
      }

      return assetsPath;
    },
  },
  customJs: {
    id: 'a2r-js',
    documentation: `Specify a path to a custom JS file that will be the last loaded script in the final deck`,
    defaultValue: '',
    acceptedValues: `Path relative to the deck's assets folder`,
    validate (value: string, _inputFolder: string, configuration: Partial<DeckConfiguration>) {
      return validateCustomPath(value, 'custom JS', configuration.assetsPath as string, PATH_VALIDATORS.FILE);
    },
  },
  customCss: {
    id: 'a2r-css',
    documentation: `Specify a path to a custom CSS file that will be the last loaded style in the final deck`,
    defaultValue: '',
    acceptedValues: `Path relative to the deck's assets folder`,
    validate (value: string, _inputFolder: string, configuration: Partial<DeckConfiguration>) {
      return validateCustomPath(value, 'custom CSS', configuration.assetsPath as string, PATH_VALIDATORS.FILE);
    },
  },
  favicon: {
    id: 'a2r-favicon',
    documentation: `Specify a path to the file containing your favicon`,
    defaultValue: '',
    acceptedValues: `Path relative to the deck's assets folder`,
    validate (value: string, _inputFolder: string, configuration: Partial<DeckConfiguration>) {
      return validateCustomPath(value, 'favicon', configuration.assetsPath as string, PATH_VALIDATORS.FILE);
    },
  },
  svgIconsFolder: {
    id: 'a2r-svg-icons-dir',
    documentation: `Specify the location of the folder containing your SVG icons`,
    defaultValue: '',
    acceptedValues: `Path relative to the deck's assets folder`,
    validate (value: string, _inputFolder: string, configuration: Partial<DeckConfiguration>) {
      return validateCustomPath(value, 'SVG icons directory', configuration.assetsPath as string, PATH_VALIDATORS.FOLDER);
    },
  },
  pageTitle: {
    id: 'a2r-page-title',
    documentation: `Specify the HTML title for the deck`,
    defaultValue: `First slide's title`,
    acceptedValues: 'Any string',
    validate (value: string) {
      return value === undefined ? undefined : sanitize(value);
    },
  },
  shouldFragmentLists: {
    id: 'a2r-fragment-lists',
    documentation: `Make all lists in the deck Reveal.js fragments`,
    defaultValue: false,
    acceptedValues: 'booleans',
    validate (value: string) {
      return validateBoolean(value, 'list fragmentation', this.defaultValue);
    },
  } as OptionBuilder<boolean>,
  shouldFragmentTables: {
    id: 'a2r-fragment-tables',
    documentation: `Make all tables in the deck Reveal.js fragments`,
    defaultValue: false,
    acceptedValues: 'booleans',
    validate (value: string) {
      return validateBoolean(value, 'table fragmentation', this.defaultValue);
    },
  } as OptionBuilder<boolean>,

  themeName: {
    id: 'a2r-theme-name',
    documentation: `Select the theme to use`,
    defaultValue: DEFAULT_THEME,
    acceptedValues: themeNames.map((name) => `\`${name}\``).join(','),
    validate (value: string) {
      return validateEnumValue(value, 'theme name', themeNames, this.defaultValue);
    },
  } as OptionBuilder<ThemeName>,
  themeColor: {
    id: 'a2r-theme-color',
    documentation: `The theme\'s accent color`,
    defaultValue: DEFAULT_COLOR,
    acceptedValues: 'oklch as JSON, ex: [ .6, .1, 170 ]',
    validate (value: string) {
      if (value === undefined) { return this.defaultValue; }

      try {
        JSON.parse(value);
      } catch (_error) {
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
        logWarn((error as Error).message);
        return this.defaultValue;
      }
    },
  },
  highlightThemeDark: {
    id: 'a2r-highlight-theme-dark',
    documentation: 'The theme for syntax coloration in dark mode',
    defaultValue: DEFAULT_DARK_HIGHLIGHT_THEME,
    acceptedValues: HIGHLIGHT_THEMES_DARK.map((name) => `\`${name}\``).join(','),
    validate (value: string) {
      return validateEnumValue(value, 'dark highlight theme', HIGHLIGHT_THEMES_DARK, this.defaultValue);
    },
  } as OptionBuilder<string>,
  highlightThemeLight: {
    id: 'a2r-highlight-theme-light',
    documentation: 'The theme for syntax coloration in light mode',
    defaultValue: DEFAULT_LIGHT_HIGHLIGHT_THEME,
    acceptedValues: HIGHLIGHT_THEMES_LIGHT.map((name) => `\`${name}\``).join(','),
    validate (value: string) {
      return validateEnumValue(value, 'light highlight theme', HIGHLIGHT_THEMES_LIGHT, this.defaultValue);
    },
  } as OptionBuilder<string>,
};

export function parseConfiguration (ast: AsciidoctorDocument, inputFolder: string): DeckConfiguration {
  const baseConfiguration = Object.entries(deckConfigurationBuilder)
    .reduce((seed, [ optionName, optionConfiguration ]) => {
        const value = ast.getAttribute(optionConfiguration.id);
        return {
          ...seed,
          [ optionName ]: optionConfiguration.validate(value, inputFolder, seed),
        };
      },
      {} as DeckConfiguration,
    );

  const themeSwitchingMode: ThemeSwitchingMode = findThemeSwitchingMode(baseConfiguration.themeName);
  const startingThemeName: ThemeFamily = baseConfiguration.themeName.split('-')[ 0 ] as ThemeFamily;
  const nonStartingThemeName: ThemeFamily = startingThemeName === 'dark' ? 'light' : 'dark';

  return {
    ...baseConfiguration,

    startingThemeName,
    nonStartingThemeName,
    themeSwitchingMode,
  };
}

function findThemeSwitchingMode (themeName: ThemeName): ThemeSwitchingMode {
  if (themeName.endsWith('-manual')) { return 'manual'; }
  if (themeName.endsWith('-auto')) { return 'auto'; }
  return 'none';
}

function validateCustomPath (value: string, name: string, baseFolder: string, pathValidator: PathValidator): string | undefined {
  if (value === undefined) { return undefined; }
  if (value.includes('..')) {
    logError(_`Cannot load ${name} ${value}, the path must be relative to ${baseFolder}, without back-tracking`({
      nodes: [ undefined, theme.strong, theme.emphasis ],
    }));
    return undefined;
  }

  const absolutePath = join(baseFolder, value);
  if (!existsSync(absolutePath)) {
    logWarn(_`Cannot load ${name} ${value}, file not found`({ nodes: [ undefined, theme.strong ] }));
    return undefined;
  }

  return pathValidator(absolutePath, name);
}

function validateEnumValue (value: string, name: string, acceptedValues: string[], defaultValue: string): string {
  if (value === undefined) { return defaultValue; }
  if (!acceptedValues.includes(value)) {
    logWarn(_`Invalid value ${value} for ${name}, accepted values are [ ${acceptedValues.join(', ')} ]. Using default value ${defaultValue} instead`({
      nodes: [ theme.error, undefined, theme.success, theme.info ],
    }));
    return defaultValue;
  }

  return value || defaultValue;
}

function validateBoolean (value: string, name: string, defaultValue: boolean): boolean {
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

function validateNumber (numberAsString: string, name: string, min: number, max: number): number {
  if (isNaN(numberAsString as unknown as number)) {
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
