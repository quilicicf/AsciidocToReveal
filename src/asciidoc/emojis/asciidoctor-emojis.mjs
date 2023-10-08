import { get } from 'https';
import { resolve } from 'path';
import { existsSync, writeFileSync } from 'fs';
import { stoyle } from 'stoyle';

import twemojiMap from './twemojis.mjs';
import { BUILD_AREA_PATH } from '../../folders.mjs';
import { theme, logWarn } from '../../log.mjs';

const UNITS = [ 'px', 'em' ];
const EMOJIS = {};

export default function register (registry) {
  if (typeof registry.register === 'function') {
    registry.register(function setInlineMacro () { this.inlineMacro(emojiInlineMacro); });
  } else if (typeof registry.block === 'function') {
    registry.inlineMacro(emojiInlineMacro);
  }
  return EMOJIS;
}

async function fetchAndWriteEmoji (emojiName, emojiUnicode, emojiFilePath) {
  const emojiContent = await fetchEmoji(emojiName, emojiUnicode);
  writeFileSync(emojiFilePath, emojiContent.toString(), 'utf8');
}

async function fetchEmoji (emojiName, emojiUnicode) {
  return new Promise((resolve, reject) => {
    get(`https://cdn.jsdelivr.net/npm/twemoji@latest/2/svg/${emojiUnicode}.svg`, (response) => {
      const dataChunks = [];
      response.on('data', (fragments) => { dataChunks.push(fragments); });
      response.on('end', () => { resolve(Buffer.concat(dataChunks).toString()); });
      response.on('error', () => { reject(Error(`Cannot retrieve emoji ${emojiName} with code ${emojiUnicode}`)); });
    });
  });
}

function emojiInlineMacro () {
  const self = this;
  self.named('emoji');
  self.positionalAttributes([ 'size', 'unit' ]);

  const defaultSize = '1em';
  self.process(function process (parent, emojiName, attributes) {
    const sizeAttribute = castSizeOrThrow(attributes.size);
    const unitAttribute = checkUnitOrThrow(attributes.unit);
    const size = sizeAttribute && unitAttribute
      ? `${sizeAttribute}${unitAttribute}`
      : defaultSize;
    const emojiUnicode = twemojiMap[ emojiName ];
    if (emojiUnicode) {
      const className = `emoji-${emojiName}`;
      const emojiFilePath = resolve(BUILD_AREA_PATH, `emoji_${emojiName}.svg`);
      const emoji = {
        filePath: emojiFilePath,
        cssClass: className,
        fetcher: existsSync(emojiFilePath)
          ? Promise.resolve()
          : fetchAndWriteEmoji(emojiName, emojiUnicode, emojiFilePath),
      };
      if (existsSync(emojiFilePath)) {
        emoji.fetcher = Promise.resolve(); // Already fetched!
      } else if (EMOJIS[ emojiName ]) {
        emoji.fetcher = EMOJIS[ emojiName ].fetcher; // Already being fetched!
      } else {
        emoji.fetcher = fetchAndWriteEmoji(emojiName, emojiUnicode, emojiFilePath);
      }
      EMOJIS[ emojiName ] = emoji;
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
    logWarn(stoyle`Skipping emoji inline macro, ${emojiName} not found`({ nodes: [ theme.strong ] }));
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
