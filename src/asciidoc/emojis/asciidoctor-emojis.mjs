import { BUILD_AREA_PATH } from '../../folders.mjs';
import { existsSync, writeTextFileSync } from '../../third-party/fs/api.mjs';
import { httpGet } from '../../third-party/http/api.mjs';
import { _, logError, theme } from '../../third-party/logger/log.mjs';
import { resolve } from '../../third-party/path/api.mjs';
import twemojiMap from './twemojis.mjs';

const UNITS = [ 'px', 'em' ];
const EMOJIS = {};

export default function register (registry) {
  registry.register(function setInlineMacro () { this.inlineMacro(emojiInlineMacro); });
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

function emojiInlineMacro () {
  const self = this;
  self.named('emoji');
  self.positionalAttributes([ 'size', 'unit' ]);

  const defaultSize = '1em';

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
    const sizeAttribute = castSizeOrThrow(attributes.size);
    const unitAttribute = checkUnitOrThrow(attributes.unit);
    const size = sizeAttribute && unitAttribute
      ? `${sizeAttribute}${unitAttribute}`
      : defaultSize;
    const emojiUnicode = twemojiMap[ emojiName ];
    if (emojiUnicode) {
      const emojiFilePath = resolve(BUILD_AREA_PATH, `emoji_${emojiName}.svg`);

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
          height: size,
          width: size,
        },
      });
    }
    logError(_`Skipping emoji inline macro, ${emojiName} not found`({ nodes: [ theme.strong ] }));
    return self.createInline(parent, 'quoted', `[emoji ${emojiName} not found]`, attributes);
  });
}

function castSizeOrThrow (size) {
  if (!size) { return undefined; }
  if (isNaN(size)) { throw Error(`Expected a number for emoji size attribute, got: ${size}`); }
  return size;
}

function checkUnitOrThrow (unit) {
  if (!unit) { return undefined; }
  if (!UNITS.includes(unit)) { throw Error(`Expected a valid unit from [ ${UNITS} ], got: ${unit}`); }
  return unit;
}
