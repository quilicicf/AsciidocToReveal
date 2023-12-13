import { Parcel } from '@parcel/core';

export async function bundle (inputFilePath, outputFolderPath, resolveFrom) {
  return await new Parcel({
    entries: [ inputFilePath ],
    mode: 'production',
    defaultConfig: '@parcel/config-default',
    shouldContentHash: false,
    defaultTargetOptions: {
      sourceMaps: false,
      distDir: outputFolderPath,
      engines: { browsers: [ 'last 1 Firefox version' ] },
    },
    additionalReporters: [
      { packageName: '@parcel/reporter-cli', resolveFrom },
    ],
  }).run();
}
