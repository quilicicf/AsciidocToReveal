import { existsSync, FileSystemPath, resolve, writeTextFileSync } from '../../third-party/file-system/api.ts';
import { httpGet } from '../../third-party/http/api.ts';
import { _, logError, theme } from '../../third-party/logger/log.ts';
import { emojisMap } from './twemojis.ts';
import {
  AsciidoctorDocument,
  AsciidoctorExtensions,
  AsciidoctorInlineMacroProcessorDsl,
  AsciidoctorRegistry,
  EmojiMap,
} from '../../domain/api.ts';
import { inlineDslAsProcessor } from '../dsl-as-processor.ts';

enum Unit {
  // noinspection JSUnusedGlobalSymbols
  PIXELS = 'px',
  EMS = 'em',
}

interface SizeAndUnit {
  size: number;
  unit: Unit;
}

const TWEMOJI_URL = 'https://twemoji-cheatsheet.vercel.app';

export default function registerEmojisExtension (registry: AsciidoctorExtensions, cachePath: FileSystemPath): EmojiMap {
  const emojisRecord: EmojiMap = {};
  registry.register(function setInlineMacro () {
    (this as AsciidoctorRegistry).inlineMacro(function emojiInlineMacro () {
      // deno-lint-ignore no-this-alias
      const self: AsciidoctorInlineMacroProcessorDsl = this;
      self.named('emoji');
      self.positionalAttributes([ 'size', 'unit' ]);

      const defaultSize = { size: 1, unit: Unit.EMS };

      function getEmojiFetcher (emojiFilePath: FileSystemPath, emojiName: string, emojiUnicode: string): Promise<void> {
        if (existsSync(emojiFilePath)) {
          return Promise.resolve(); // Already fetched!
        } else if (emojisRecord[ emojiName ]) {
          return Promise.resolve(); // Already being fetched!
        } else {
          return fetchAndWriteEmoji(emojiName, emojiUnicode, emojiFilePath);
        }
      }

      self.process(function process (parent: AsciidoctorDocument, emojiName: string, attributes: Record<string, string>) {
        const { size, unit } = validateSizeAndUnit(attributes.size, attributes.unit) || defaultSize;

        const cssSize = `${size}${unit}`;
        const emojiUnicode = emojisMap[ emojiName ];
        if (emojiUnicode) {
          const emojiFilePath = resolve(cachePath, `emoji_${emojiName}.svg`);

          emojisRecord[ emojiName ] = {
            filePath: emojiFilePath,
            cssClass: `emoji-${emojiName}`,
            fetcher: getEmojiFetcher(emojiFilePath, emojiName, emojiUnicode),
          };

          return inlineDslAsProcessor(self).createInline(parent, 'image', '', {
            target: '',
            type: 'emoji',
            attributes: {
              alt: emojiName,
              height: cssSize,
              width: cssSize,
            },
          });
        }
        logError(_`Skipping emoji inline macro, ${emojiName} not found. Search for available emojis here ${TWEMOJI_URL}`({ nodes: [ theme.strong ] }));
        return inlineDslAsProcessor(self).createInline(parent, 'quoted', `[emoji ${emojiName} not found]`, attributes);
      });
    });
  });
  return emojisRecord;
}

async function fetchAndWriteEmoji (emojiName: string, emojiUnicode: string, emojiFilePath: FileSystemPath): Promise<void> {
  try {
    const emojiContent: string = await httpGet(`https://cdn.jsdelivr.net/npm/twemoji@latest/2/svg/${emojiUnicode}.svg`);
    writeTextFileSync(emojiFilePath, emojiContent.toString());
  } catch (_error) {
    logError(_`Cannot retrieve emoji ${emojiName} with code ${emojiUnicode}`({ nodes: [ theme.strong, theme.strong ] }));
  }
}

function validateSizeAndUnit (inputSize: string, inputUnit: string): SizeAndUnit | undefined {
  if (!inputSize || !inputUnit) { return undefined; }
  if (isNaN(inputSize as unknown as number)) {
    logError(_`Expected a number for emoji size attribute, got: ${inputSize}`({ nodes: [ theme.error ] }));
    return undefined;
  }
  if (!Object.values(Unit).includes(inputUnit as Unit)) {
    logError(_`Expected a valid unit from [ ${Object.values(Unit)} ], got: ${inputUnit}`({
      nodes: [ theme.success, theme.error ],
    }));
    return undefined;
  }

  return {
    size: parseInt(inputSize, 10),
    unit: inputUnit as Unit,
  };
}
