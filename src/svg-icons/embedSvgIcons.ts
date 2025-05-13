import { toDom } from '../third-party/dom/api.ts';
import {
  FileSystemPath,
  getBaseName,
  getExtension,
  readDirSync,
  readTextFileSync,
  resolve,
} from '../third-party/file-system/api.ts';
import { _, logError, logInfo, theme } from '../third-party/logger/log.ts';
import { Deck, Dom, SvgIcon } from '../domain/api.ts';

const ICONS_STYLE: string = `
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

export default function embedSvgIcons (dom: Dom, deck: Deck): Dom {
  const { configuration: { svgIconsFolder }, svgIcons } = deck;

  if (!svgIconsFolder) { return dom; }

  readDirSync(svgIconsFolder)
    .map((filePath) => prepareIcon(svgIconsFolder, filePath))
    .filter(Boolean) // Remove undefined values for icons that failed to load
    .reduce(
      (seed, svgIcon) => {
        seed[ (svgIcon as SvgIcon).id ] = svgIcon as SvgIcon;
        return seed;
      },
      svgIcons as Record<string, SvgIcon>,
    );

  const foundIconIds = Object.keys(svgIcons);
  logInfo(`Found and loaded SVG icons : [${foundIconIds.join(',')}]`);

  const symbols = Object.values(svgIcons)
    .map((svgIcon) => svgIcon.svg)
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

function prepareIcon (svgIconsFolder: FileSystemPath, fileName: FileSystemPath): SvgIcon | undefined {
  const filePath = resolve(svgIconsFolder, fileName);
  const svg = readTextFileSync(filePath);
  const extension = getExtension(fileName);
  const svgId = getBaseName(fileName, extension);
  try {
    const svgDom = toDom(svg);
    const svgNode = svgDom.select('svg') as Element;

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
    svgNode.setAttribute('id', `${svgId}-icon`);

    const [ left, top, width, height ] = (svgNode.getAttribute('viewBox') as string).split(' ');

    return {
      id: svgId,
      left: parseInt(left, 10),
      top: parseInt(top, 10),
      width: parseInt(width, 10),
      height: parseInt(height, 10),
      body: `<use href="#${svgId}-icon"></use>`,
      svg: svgNode.outerHTML
        .replaceAll('<svg', '<symbol')
        .replaceAll('</svg>', '</symbol>'),
    };

  } catch (_error) {
    const shortPath = `${svgIconsFolder}/${fileName}`;
    logError(_`Cannot load SVG icon ${shortPath}`({ nodes: [ theme.strong ] }));
    return undefined;
  }
}
