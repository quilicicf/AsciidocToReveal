import { _, logError, theme } from '../third-party/logger/log.ts';

export enum Unit {
  // noinspection JSUnusedGlobalSymbols
  PIXELS = 'px',
  EMS = 'em',
}

export interface SizeAndUnit {
  size: number;
  unit: Unit;
}

export function validateSizeAndUnit (inputSize: string, inputUnit: string): SizeAndUnit | undefined {
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
