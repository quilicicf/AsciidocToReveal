import { existsSync, writeTextFileSync } from '../../third-party/fs/api.mjs';
import { httpGet } from '../../third-party/http/api.mjs';
import { _, logError, theme } from '../../third-party/logger/log.mjs';
import { resolve } from '../../third-party/path/api.mjs';
import twemojiMap from './twemojis.mjs';

const UNITS = [ 'px', 'em' ];
const EMOJIS = {};

export default function register (registry, cachePath) {
  registry.register(function setInlineMacro () {
    this.inlineMacro(function emojiInlineMacro () {
      const self = this;
      self.named('emoji');
      self.positionalAttributes([ 'size', 'unit' ]);

      const defaultSize = [ 1, 'em' ];

      function getEmojiFetcher (emojiFilePath, emojiName, emojiUnicode) {
        if (existsSync(emojiFilePath)) {
          return Promise.resolve(); // Already fetched!
        } else if (EMOJIS[ emojiName ]) {
          return Promise.resolve(); // Already being fetched!
        } else {
          return fetchAndWriteEmoji(emojiName, emojiUnicode, emojiFilePath);
        }
      }

      self.process(function process (parent, emojiName, attributes) {
        const [ size, unit ] = validateSizeAndUnit(attributes.size, attributes.unit) || defaultSize;

        const cssSize = `${size}${unit}`;
        const emojiUnicode = twemojiMap[ emojiName ];
        if (emojiUnicode) {
          const emojiFilePath = resolve(cachePath, `emoji_${emojiName}.svg`);

          EMOJIS[ emojiName ] = {
            filePath: emojiFilePath,
            cssClass: `emoji-${emojiName}`,
            fetcher: getEmojiFetcher(emojiFilePath, emojiName, emojiUnicode),
          };

          return self.createInline(parent, 'image', '', {
            target: '',
            type: 'emoji',
            attributes: {
              alt: emojiName,
              height: cssSize,
              width: cssSize,
            },
          });
        }
        logError(_`Skipping emoji inline macro, ${emojiName} not found`({ nodes: [ theme.strong ] }));
        return self.createInline(parent, 'quoted', `[emoji ${emojiName} not found]`, attributes);
      });
    });
  });
  return EMOJIS;
}

async function fetchAndWriteEmoji (emojiName, emojiUnicode, emojiFilePath) {
  try {
    const emojiContent = await httpGet(`https://cdn.jsdelivr.net/npm/twemoji@latest/2/svg/${emojiUnicode}.svg`);
    writeTextFileSync(emojiFilePath, emojiContent.toString());
  } catch (ignore) {
    logError(_`Cannot retrieve emoji ${emojiName} with code ${emojiUnicode}`({ nodes: [ theme.strong, theme.strong ] }));
  }
}

function validateSizeAndUnit (inputSize, inputUnit) {
  if (!inputSize || !inputUnit) { return undefined; }
  if (isNaN(inputSize)) {
    logError(_`Expected a number for emoji size attribute, got: ${inputSize}`({ nodes: [ theme.error ] }));
    return undefined;
  }
  if (!UNITS.includes(inputUnit)) {
    logError(_`Expected a valid unit from [ ${UNITS} ], got: ${inputUnit}`({ nodes: [ theme.success, theme.error ] }));
    return undefined;
  }

  return [ parseInt(inputSize), inputUnit ];
}
