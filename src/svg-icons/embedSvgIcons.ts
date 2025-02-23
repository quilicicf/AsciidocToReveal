import { toDom } from '../third-party/dom/api.ts';
import { readDirSync, readTextFileSync } from '../third-party/fs/api.ts';
import { _, logError, logInfo, theme } from '../third-party/logger/log.ts';
import { getBaseName, getExtension, resolve } from '../third-party/path/api.ts';
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

  const foundSvgIcons: SvgIcon[] = readDirSync(svgIconsFolder)
    .map((filePath) => prepareIcon(svgIconsFolder, filePath))
    .filter(Boolean) as SvgIcon[]; // Remove undefined values for icons that failed to load

  const foundIconIds = foundSvgIcons.map(({ id }) => id);
  logInfo(`Found and loaded SVG icons : [${foundIconIds.join(',')}]`);
  svgIcons.push(...foundIconIds);

  const symbols = foundSvgIcons
    .map(({ svg }) => svg)
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

function prepareIcon (svgIconsFolder: string, fileName: string): SvgIcon | undefined {
  const filePath = resolve(svgIconsFolder, fileName);
  const svg = readTextFileSync(filePath);
  const extension = getExtension(fileName);
  const svgId = getBaseName(fileName, extension);
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
    svgNode.setAttribute('id', `${svgId}-icon`);

    return {
      id: svgId,
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
