import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { stoyle } from 'stoyle';

import { insertInlineScript, insertInlineStyle } from '../domUtils.mjs';
import { logInfo, logWarn, theme } from '../log.mjs';

export default function insertCustomFiles (dom, { inputFolder, configuration }) {
  const { customCss, customJs } = configuration;
  const messageBits = [];
  if (customCss) {
    messageBits.push(stoyle`custom CSS ${customCss}`({ nodes: [ theme.strong ] }));
    const customCssPath = resolve(inputFolder, customCss);

    if (existsSync(customCssPath)) {
      insertInlineStyle(dom, 'CUSTOM', readFileSync(customCssPath, 'utf8'));
    } else {
      logWarn(stoyle`Could not add custom CSS ${customCss}, not found`({ nodes: [ theme.strong ] }));
    }
  }

  if (customJs) {
    messageBits.push(stoyle`custom JS ${customJs}`({ nodes: [ theme.strong ] }));
    const customJsPath = resolve(inputFolder, customJs);

    if (existsSync(customJsPath)) {
      insertInlineScript(dom, 'CUSTOM', readFileSync(customJsPath, 'utf8'));
    } else {
      logWarn(stoyle`Could not add custom JS ${customJs}, not found`({ nodes: [ theme.strong ] }));
    }
  }

  if (messageBits.length) {
    logInfo(`Injecting ${messageBits.join(' & ')}`);
  }

  return dom;
}
