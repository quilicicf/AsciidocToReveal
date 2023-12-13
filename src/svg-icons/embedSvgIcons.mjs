import { toDom } from '../third-party/dom/api.mjs';
import { readdirSync, readTextFileSync } from '../third-party/fs/api.mjs';
import { _, logError, theme } from '../third-party/logger/log.mjs';
import { getBaseName, getExtension, resolve } from '../third-party/path/api.mjs';

const ICONS_STYLE = `
  .icon-label {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .inline-icon {
    display: inline-block;
    width: .9em;
    height: .9em;
  }
  
  .main-color { 
    fill: var(--r-main-color);
  }
  
  .background-color { 
    fill: var(--r-background-color);
  }
`;

export default function embedSvgIcons (dom, deck) {
  const { configuration: { svgIconsFolder } } = deck;

  if (!svgIconsFolder) { return dom; }

  const symbols = readdirSync(svgIconsFolder)
    .map((filePath) => prepareIcon(svgIconsFolder, filePath))
    .filter(Boolean) // Remove undefined values for icons that failed to load
    .join('\n');

  const iconsLib = `
    <svg id="ICONS_LIB" style="display:none">
      <style></style>
      <defs>${symbols}</defs>
    </svg>
  `;

  dom.insertInlineStyle('ICONS', ICONS_STYLE);
  dom.insertHtml('body', iconsLib);
  return dom;
}

function prepareIcon (svgIconsFolder, fileName) {
  const filePath = resolve(svgIconsFolder, fileName);
  const svg = readTextFileSync(filePath);
  const extension = getExtension(fileName);
  const baseName = getBaseName(fileName, extension);
  try {
    const svgDom = toDom(svg);
    const svgNode = svgDom.select('svg');

    if (svgNode.hasAttribute('viewBox')) {
      // Nothing to do, using the viewBox as intended
    } else if (svgNode.hasAttribute('width') && svgNode.hasAttribute('height')) {
      svgNode.setAttribute('viewBox', `0 0 ${svgNode.hasAttribute('width')} ${svgNode.hasAttribute('height')}`);
    } else {
      logError(_`Cannot load icon ${fileName}, missing viewBox and cannot build it from width & height`({ nodes: [ theme.strong ] }));
      return undefined;
    }
    svgNode.removeAttribute('width');
    svgNode.removeAttribute('height');
    svgNode.setAttribute('id', `${baseName}-icon`);

    return svgNode.outerHTML
      .replaceAll('<svg', '<symbol')
      .replaceAll('</svg>', '</symbol>');

  } catch (error) {
    const shortPath = `${svgIconsFolder}/${fileName}`;
    logError(_`Cannot load SVG icon ${shortPath}`({ nodes: [ theme.strong ] }));
    return undefined;
  }
}
