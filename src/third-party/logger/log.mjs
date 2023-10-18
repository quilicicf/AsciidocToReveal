import { DecorationCode, ForegroundSimpleCode, stoyle } from 'stoyle';

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

export const _ = stoyle;

export function logInfo (content) {
  const message = formatLog(content, 'INFO', theme.info);
  process.stdout.write(message);
}

export function logWarn (content) {
  const message = formatLog(content, 'WARN', theme.warning);
  process.stdout.write(message);
}

export function logError (content) {
  const message = formatLog(content, 'ERROR', theme.error);
  process.stdout.write(message);
}

function formatLog (content, type, style) {
  return _`[${type}] `({ nodes: [ style ] }) + content + '\n';
}
