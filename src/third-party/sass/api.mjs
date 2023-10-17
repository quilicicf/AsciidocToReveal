import { compileString } from 'sass';

export function compileStyle (source, modulesPath) {
  const { css } = compileString(
    source,
    {
      style: 'compressed',
      loadPaths: [ modulesPath ],
      sourceMap: false,
      verbose: true,
    },
  );
  return css;
}
