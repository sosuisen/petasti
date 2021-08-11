/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { AvatarProp, CardProp } from '../modules_common/cardprop';
import { CardCssStyle, ICardEditor } from '../modules_common/types_cardeditor';
import { convertHexColorToRgba, darkenHexColor } from '../modules_common/color';
import window from './window';
import { getCtrlDown } from '../modules_common/keys';
import { Avatar, Geometry } from '../modules_common/schema_avatar';

let cardCssStyle: CardCssStyle;
let avatarProp: AvatarProp;
let cardEditor: ICardEditor;

export const shadowHeight = 5;
export const shadowWidth = 5;
let renderOffsetHeight = 0; // Offset of card height from actual window height;
let renderOffsetWidth = 0; // Offset of card height from actual window width;

export const getRenderOffsetWidth = () => {
  return renderOffsetWidth;
};
export const setRenderOffsetWidth = (w: number) => {
  renderOffsetWidth = w;
};
export const getRenderOffsetHeight = () => {
  return renderOffsetHeight;
};
export const setRenderOffsetHeight = (h: number) => {
  renderOffsetHeight = h;
};

export const initCardRenderer = (
  prop: AvatarProp,
  style: CardCssStyle,
  editor: ICardEditor
) => {
  avatarProp = prop;
  cardCssStyle = style;
  cardEditor = editor;
};

export type CardRenderOptions =
  | 'TitleBar'
  | 'TitleBarStyle'
  | 'CardStyle'
  | 'ContentsData'
  | 'ContentsRect'
  | 'EditorStyle'
  | 'EditorRect';

const setWindowTitle = () => {
  window.api.setTitle(avatarProp.url, AvatarProp.getPlainText(avatarProp.data));
};

const renderTitleBar = () => {
  const titleWidth = avatarProp.geometry.width - cardCssStyle.borderWidth * 2 - shadowWidth;
  document.getElementById('title')!.style.width = titleWidth + 'px';
  const closeBtnLeft = titleWidth - document.getElementById('closeBtn')!.offsetWidth;
  document.getElementById('closeBtn')!.style.left = closeBtnLeft + 'px';

  if (getCtrlDown() || avatarProp.data === '') {
    document.getElementById('closeIcon')!.className = 'far fa-trash-alt title-btn-icon';
  }
  else {
    document.getElementById('closeIcon')!.className = 'fas fa-minus-circle title-btn-icon';
  }

  const titleBarLeft =
    document.getElementById('codeBtn')!.offsetLeft +
    document.getElementById('codeBtn')!.offsetWidth;
  const barwidth = closeBtnLeft - titleBarLeft;
  document.getElementById('titleBar')!.style.left = titleBarLeft + 'px';
  document.getElementById('titleBar')!.style.width = barwidth + 'px';

  if (cardEditor.isOpened) {
    document.getElementById('codeBtn')!.style.visibility = 'visible';
  }
  else {
    document.getElementById('codeBtn')!.style.visibility = 'hidden';
  }
  /**
   * TODO: Update title when avatarProp.data changes
   */
  setWindowTitle();
};

const renderTitleBarStyle = () => {
  const darkerColor = darkenHexColor(avatarProp.style.backgroundColor, 0.6);
  document.getElementById('newBtn')!.style.color = darkerColor;
  document.getElementById('closeBtn')!.style.color = darkerColor;

  if (cardEditor.isCodeMode) {
    document.getElementById('codeBtn')!.style.color = '#ff0000';
  }
  else {
    document.getElementById('codeBtn')!.style.color = darkerColor;
  }
};

const renderContentsData = () => {
  return new Promise((resolve, reject) => {
    //    console.debug('renderContentsData');

    // Script and CSS loaded from contents_frame.html are remained after document.write().
    const html = `<!DOCTYPE html>
  <html>
    <head>
      <link href='./css/ckeditor-rxdesktop-contents.css' type='text/css' rel='stylesheet' />
      <script> var exports = {}; </script>
      <script type='text/javascript' src='./iframe/contents_frame.js'></script>
    </head>
    <body>
      ${avatarProp.data}
    </body>
  </html>`;
    try {
      const iframe = document.getElementById('contentsFrame') as HTMLIFrameElement;
      iframe.contentWindow!.document.write(html);
      iframe.contentWindow!.document.close();
      const checkLoading = () => {
        iframe.removeEventListener('load', checkLoading);
        resolve();
      };
      iframe.addEventListener('load', checkLoading);
    } catch (e) {
      reject(e);
    }
  });
};

const renderCardAndContentsRect = () => {
  // cardOffset is adjustment for box-shadow
  let cardOffset = 0;
  if (avatarProp.status === 'Blurred') {
    cardOffset = cardCssStyle.borderWidth;
  }
  const cardWidth =
    avatarProp.geometry.width - cardOffset - shadowWidth + getRenderOffsetWidth();

  const cardHeight =
    avatarProp.geometry.height - cardOffset - shadowHeight + getRenderOffsetHeight();

  document.getElementById('card')!.style.width = cardWidth + 'px';
  document.getElementById('card')!.style.height = cardHeight + 'px';

  // width of BrowserWindow (namely avatarProp.geometry.width) equals border + padding + content.
  const contentsWidth =
    avatarProp.geometry.width +
    renderOffsetWidth -
    cardCssStyle.borderWidth * 2 -
    shadowWidth;

  const contentsHeight =
    avatarProp.geometry.height +
    renderOffsetHeight -
    cardCssStyle.borderWidth * 2 -
    document.getElementById('title')!.offsetHeight -
    shadowHeight;

  document.getElementById('contents')!.style.width = contentsWidth + 'px';
  document.getElementById('contents')!.style.height = contentsHeight + 'px';

  document.getElementById('resizeAreaRight')!.style.top = '0px';
  document.getElementById('resizeAreaRight')!.style.left =
    cardWidth - cardCssStyle.borderWidth + 'px';

  document.getElementById('resizeAreaRight')!.style.width =
    cardCssStyle.borderWidth * 2 + 'px';
  document.getElementById('resizeAreaRight')!.style.height =
    cardHeight - cardCssStyle.borderWidth + 'px';

  document.getElementById('resizeAreaBottom')!.style.top =
    cardHeight - cardCssStyle.borderWidth + 'px';
  document.getElementById('resizeAreaBottom')!.style.left = '0px';
  document.getElementById('resizeAreaBottom')!.style.width =
    cardWidth - cardCssStyle.borderWidth + 'px';
  document.getElementById('resizeAreaBottom')!.style.height =
    cardCssStyle.borderWidth * 2 + 'px';

  // document.getElementById('resizeAreaRightBottom')!.style.top = cardHeight + 'px';
  // document.getElementById('resizeAreaRightBottom')!.style.left = cardWidth + 'px';
  document.getElementById('resizeAreaRightBottom')!.style.top =
    cardHeight - cardCssStyle.borderWidth + 'px';
  document.getElementById('resizeAreaRightBottom')!.style.left =
    cardWidth - cardCssStyle.borderWidth + 'px';
  document.getElementById('resizeAreaRightBottom')!.style.width =
    cardCssStyle.borderWidth * 2 + 'px';
  document.getElementById('resizeAreaRightBottom')!.style.height =
    cardCssStyle.borderWidth * 2 + 'px';
};

const renderCardStyle = () => {
  if (avatarProp.status === 'Focused') {
    document.getElementById(
      'card'
    )!.style.border = `${cardCssStyle.borderWidth}px solid red`;
  }
  else if (avatarProp.status === 'Blurred') {
    document.getElementById(
      'card'
    )!.style.border = `${cardCssStyle.borderWidth}px solid transparent`;
  }

  /**
   * The card cannot be moved by mouse when #title is hidden.
   * When hidden, #title changes to visible at the first mouse down.
   * It can be moved by mouse after the second mouse down.
   * So, the user need to click twice when #title is hidden.
   * Use opacity instead of visible/hidden.
  document.getElementById('title')!.style.visibility = 'visible';
  if (avatarProp.style.opacity === 0 && avatarProp.status === 'Blurred') {
    document.getElementById('title')!.style.visibility = 'hidden';
  }
   */
  document.getElementById('title')!.style.opacity = '1.0';
  if (avatarProp.style.opacity === 0 && avatarProp.status === 'Blurred') {
    document.getElementById('title')!.style.opacity = '0.01';
  }

  // Set card properties
  const backgroundRgba = convertHexColorToRgba(
    avatarProp.style.backgroundColor,
    avatarProp.style.opacity
  );
  document.getElementById('contents')!.style.backgroundColor = backgroundRgba;
  const darkerRgba = convertHexColorToRgba(
    darkenHexColor(avatarProp.style.backgroundColor),
    avatarProp.style.opacity
  );

  const uiRgba = convertHexColorToRgba(avatarProp.style.uiColor);

  document.getElementById('title')!.style.backgroundColor = uiRgba;

  let boxShadow = 'none';
  if (avatarProp.style.opacity !== 0 || avatarProp.status === 'Focused') {
    boxShadow = '5px 5px 3px 0px rgba(0,0,0, .2)';
  }
  document.getElementById('card')!.style.boxShadow = boxShadow;

  const scrollBarRgba = convertHexColorToRgba(
    darkenHexColor(avatarProp.style.backgroundColor, 0.85)
  );

  // eslint-disable-next-line no-useless-catch
  try {
    const iframeDoc = (document.getElementById('contentsFrame') as HTMLIFrameElement)
      .contentDocument;
    if (iframeDoc) {
      const style = iframeDoc.createElement('style');
      style.innerHTML =
        'body::-webkit-scrollbar { width: 7px; background-color: ' +
        backgroundRgba +
        '}\n' +
        'body::-webkit-scrollbar-thumb { background-color: ' +
        scrollBarRgba +
        '}';
      iframeDoc.head.appendChild(style);

      iframeDoc.body.style.zoom = `${avatarProp.style.zoom}`;
    }
  } catch (e) {
    console.error(e);
  }
};

const renderEditorStyle = () => {
  cardEditor.setColor();
  cardEditor.setZoom();
};

const renderEditorRect = () => {
  cardEditor.setSize();
};

export const setTitleMessage = (msg: string) => {
  if (document.getElementById('titleMessage')) {
    document.getElementById('titleMessage')!.innerHTML = msg;
  }
};

export const render = async (
  options: CardRenderOptions[] = [
    'TitleBar',
    'TitleBarStyle',
    'ContentsData',
    'ContentsRect',
    'CardStyle',
    'EditorStyle',
    'EditorRect',
  ]
) => {
  /**
   * NOTE: CardStyle depends on completion of ContentsData
   */
  if (options.includes('ContentsData')) {
    options = options.filter(opt => opt !== 'ContentsData');
    await renderContentsData().catch(e =>
      console.error('Error in renderContentsData: ' + e)
    );
  }

  for (const opt of options) {
    if (opt === 'TitleBar') {
      renderTitleBar();
    }
    else if (opt === 'TitleBarStyle') {
      renderTitleBarStyle();
    }
    else if (opt === 'ContentsRect') {
      renderCardAndContentsRect();
    }
    else if (opt === 'CardStyle') {
      renderCardStyle();
    }
    else if (opt === 'EditorStyle') {
      renderEditorStyle();
    }
    else if (opt === 'EditorRect') {
      renderEditorRect();
    }
  }
};

export const onResizeByHand = (newBounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  if (
    avatarProp.geometry.x !== newBounds.x ||
    avatarProp.geometry.y !== newBounds.y ||
    avatarProp.geometry.width !== newBounds.width ||
    avatarProp.geometry.height !== newBounds.height
  ) {
    avatarProp.geometry.x = Math.round(newBounds.x);
    avatarProp.geometry.y = Math.round(newBounds.y);
    avatarProp.geometry.width = Math.round(newBounds.width - getRenderOffsetWidth());
    avatarProp.geometry.height = Math.round(newBounds.height - getRenderOffsetHeight());

    render(['TitleBar', 'ContentsRect', 'EditorRect']);
  }
  //  queueSaveCommand();
};

// eslint-disable-next-line complexity
const dispatch = (event: MessageEvent) => {
  if (
    event.source !== window ||
    event.data.command === undefined ||
    event.data.doc === undefined ||
    event.data.command !== 'reactive-forward'
  )
    return;

  /* TODO:
   * This will be replaced by React Virtual DOM
   */
  if (!event.data.propertyName) {
    // Update whole document
    const avatar = event.data.doc as Avatar;
    onResizeByHand(avatar.geometry);
    // onMoveByHand(avatar.geometry);
    /**
     * TODO: set updated state to avatarProp
     */
  }
  else if (event.data.propertyName === 'geometry') {
    const geometry = event.data.doc as Geometry;
    if (
      avatarProp.geometry.width !== geometry.width ||
      avatarProp.geometry.height !== geometry.height
    ) {
      onResizeByHand(geometry);
    }

    if (avatarProp.geometry.x !== geometry.x || avatarProp.geometry.y !== geometry.y) {
      avatarProp.geometry.x = geometry.x;
      avatarProp.geometry.y = geometry.y;
    }

    if (avatarProp.geometry.z !== geometry.z) {
      avatarProp.geometry.z = geometry.z;
    }
  }
};

// Receive message from Main process via preload
window.addEventListener('message', dispatch);
const cleanup = () => {
  window.removeEventListener('message', dispatch);
};
