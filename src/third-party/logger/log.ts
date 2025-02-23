import { DecorationCode, ForegroundSimpleCode, Style, stoyle } from 'npm:stoyle';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface StoyleTheme {
  dim: Style,
  strong: Style,
  emphasis: Style,
  info: Style,
  error: Style,
  warning: Style,
  success: Style,
  link: Style,
}

export const theme: StoyleTheme = {
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

export function logInfo (content: string): void {
  const message = formatLog(content, 'INFO', theme.info);
  console.log(message);
}

export function logWarn (content: string) {
  const message = formatLog(content, 'WARN', theme.warning);
  console.warn(message);
}

export function logError (content: string) {
  const message = formatLog(content, 'ERROR', theme.error);
  console.error(message);
}

function formatLog (content: string, level: LogLevel, style: Style): string {
  return _`[${level}] `({ nodes: [ style ] }) + content;
}
