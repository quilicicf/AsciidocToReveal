import postcss, { Processor } from 'npm:postcss';
import postcssNesting from 'npm:postcss-nesting';

const POST_PROCESSOR: Processor = postcss([ postcssNesting() ]);

export async function processCss (rawCss: string): Promise<string> {
  const { css } = await POST_PROCESSOR.process(rawCss, { from: undefined });
  return css;
}
