import { DecorationCode, ForegroundSimpleCode } from 'stoyle/dist/mod.js';

export default {
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
