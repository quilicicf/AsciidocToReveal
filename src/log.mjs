import { stoyle } from 'stoyle';

import theme from './theme.mjs';

function format (content, type, style) {
  return stoyle`[${type}] `({ nodes: [ style ] }) + content + '\n';
}

export function logInfo (content) {
  const message = format(content, 'INFO', theme.info);
  process.stdout.write(message);
}

export function logWarn (content) {
  const message = format(content, 'WARN', theme.warning);
  process.stdout.write(message);
}

export function logError (content) {
  const message = format(content, 'WARN', theme.warning);
  process.stdout.write(message);
}
