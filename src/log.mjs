import { stoyle, DecorationCode, ForegroundSimpleCode } from 'stoyle';

export const theme = {
  // Generic
  dim: { decoration: DecorationCode.Dim },
  strong: { decoration: DecorationCode.Bold },
  emphasis: { decoration: DecorationCode.Italic },
  info: { color: ForegroundSimpleCode.FG_Blue },
  error: { color: ForegroundSimpleCode.FG_Red },
  warning: { color: ForegroundSimpleCode.FG_Yellow },
  success: { color: ForegroundSimpleCode.FG_Green },
  link: { color: ForegroundSimpleCode.FG_Blue, decoration: DecorationCode.Underline },
};


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
