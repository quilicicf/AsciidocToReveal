import {
  AsciidoctorBlockProcessor,
  AsciidoctorBlockProcessorDsl,
  AsciidoctorInlineMacroProcessor,
  AsciidoctorInlineMacroProcessorDsl,
} from '../domain/api.ts';

/**
 * Can't understand what the method {Registry.inlineMacro} gives me as input.
 * It looks like it's both the DSL and processor since all of their methods to work.
 * Can't be bothered to look further right now.
 */
export function inlineDslAsProcessor (input: AsciidoctorInlineMacroProcessorDsl): AsciidoctorInlineMacroProcessor {
  return input as unknown as AsciidoctorInlineMacroProcessor;
}


/**
 * Can't understand what the method {Registry.block} gives me as input.
 * It looks like it's both the DSL and processor since all of their methods to work.
 * Can't be bothered to look further right now.
 */
export function blockDslAsProcessor (input: AsciidoctorBlockProcessorDsl): AsciidoctorBlockProcessor {
  return input as unknown as AsciidoctorBlockProcessor;
}
