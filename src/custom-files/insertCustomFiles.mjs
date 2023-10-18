import { existsSync, readTextFileSync } from '../third-party/fs/api.mjs';
import { _, logInfo, logWarn, theme } from '../third-party/logger/log.mjs';
import { resolve } from '../third-party/path/api.mjs';

export default function insertCustomFiles (dom, { inputFolder, configuration }) {
  const { customCss, customJs } = configuration;
  const messageBits = [];
  if (customCss) {
    messageBits.push(_`custom CSS ${customCss}`({ nodes: [ theme.strong ] }));
    const customCssPath = resolve(inputFolder, customCss);

    if (existsSync(customCssPath)) {
      dom.insertInlineStyle('CUSTOM', readTextFileSync(customCssPath));
    } else {
      logWarn(_`Could not add custom CSS ${customCss}, not found`({ nodes: [ theme.strong ] }));
    }
  }

  if (customJs) {
    messageBits.push(_`custom JS ${customJs}`({ nodes: [ theme.strong ] }));
    const customJsPath = resolve(inputFolder, customJs);

    if (existsSync(customJsPath)) {
      dom.insertInlineScript('CUSTOM', readTextFileSync(customJsPath));
    } else {
      logWarn(_`Could not add custom JS ${customJs}, not found`({ nodes: [ theme.strong ] }));
    }
  }

  if (messageBits.length) {
    logInfo(`Injecting ${messageBits.join(' & ')}`);
  }

  return dom;
}
