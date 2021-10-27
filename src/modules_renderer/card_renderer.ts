/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { CardCssStyle, ICardEditor } from '../modules_common/types_cardeditor';
import { convertHexColorToRgba, darkenHexColor } from '../modules_common/color';
import window from './window';
import { getCtrlDown } from '../modules_common/keys';
import { cardStore } from './card_store';
import { CARD_MARGIN_LEFT, CARD_MARGIN_TOP, CARD_PADDING } from '../modules_common/const';

let cardCssStyle: CardCssStyle;
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

export const initCardRenderer = (style: CardCssStyle, editor: ICardEditor) => {
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

const getPlainText = (data: string) => {
  if (data === '') {
    return '';
  }

  // Replace alt attributes
  data = data.replace(/<[^>]+?alt=["'](.+?)["'][^>]+?>/g, '$1');

  return data.replace(/<[^>]+?>/g, '').substr(0, 30);
};

const setWindowTitle = () => {
  window.api.setTitle(
    cardStore.getState().workState.url,
    getPlainText(cardStore.getState().body._body)
  );
};

const renderTitleBar = () => {
  const titleWidth =
    cardStore.getState().sketch.geometry.width - cardCssStyle.borderWidth * 2 - shadowWidth;
  document.getElementById('title')!.style.width = titleWidth + 'px';
  const closeBtnLeft = titleWidth - document.getElementById('closeBtn')!.offsetWidth;
  document.getElementById('closeBtn')!.style.left = closeBtnLeft + 'px';

  if (getCtrlDown() || cardStore.getState().body._body === '') {
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

  if (cardEditor.isOpened && cardEditor.hasCodeMode) {
    document.getElementById('codeBtn')!.style.visibility = 'visible';
  }
  else {
    document.getElementById('codeBtn')!.style.visibility = 'hidden';
  }
  /**
   * TODO: Update title when cardPropStatus.data changes
   */
  setWindowTitle();
};

const renderTitleBarStyle = () => {
  const darkerColor = darkenHexColor(
    cardStore.getState().sketch.style.backgroundColor,
    0.6
  );
  document.getElementById('newBtn')!.style.color = darkerColor;
  document.getElementById('closeBtn')!.style.color = darkerColor;

  if (cardEditor.isCodeMode) {
    document.getElementById('codeBtn')!.style.color = '#ff0000';
  }
  else {
    document.getElementById('codeBtn')!.style.color = darkerColor;
  }
};

const renderContentsData = (): void => {
  document.getElementById('contentsFrame')!.innerHTML = cardEditor.getHTML();
  /*
  return new Promise((resolve, reject) => {
    //    console.debug('renderContentsData');
    // ${cardStore.getState().body._body}
   

    // Script and CSS loaded from contents_frame.html are remained after document.write().
    const html = `<!DOCTYPE html>
  <html>
    <head>
      <link href='./fontawesome/css/all.min.css' type='text/css' rel='stylesheet'>
      <link href='./css/prism-material-light.css?20210924' type='text/css' rel='stylesheet'>      
      <link href='./css/markdown-contents.css' type='text/css' rel='stylesheet' />
      <link href='./css/markdown-nodes.css' type='text/css' rel='stylesheet' />
      <script> var exports = {}; </script>
      <script type='text/javascript' src='./iframe/contents_frame.js'></script>
    </head>
    <body>
      ${body}
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
  */
};

const renderCardAndContentsRect = () => {
  // cardOffset is adjustment for box-shadow
  let cardOffset = 0;
  if (cardStore.getState().workState.status === 'Blurred') {
    cardOffset = cardCssStyle.borderWidth;
  }
  const cardWidth =
    cardStore.getState().sketch.geometry.width -
    cardOffset -
    shadowWidth +
    getRenderOffsetWidth();

  const cardHeight =
    cardStore.getState().sketch.geometry.height -
    cardOffset -
    shadowHeight +
    getRenderOffsetHeight();

  document.getElementById('card')!.style.width = cardWidth + 'px';
  document.getElementById('card')!.style.height = cardHeight + 'px';

  // width of BrowserWindow (namely cardPropStatus.geometry.width) equals border + padding + content.
  const contentsWidth =
    cardStore.getState().sketch.geometry.width +
    renderOffsetWidth -
    cardCssStyle.borderWidth * 2 -
    shadowWidth;

  const contentsHeight =
    cardStore.getState().sketch.geometry.height +
    renderOffsetHeight -
    cardCssStyle.borderWidth * 2 -
    document.getElementById('title')!.offsetHeight -
    shadowHeight;

  document.getElementById('contents')!.style.width = contentsWidth + 'px';
  document.getElementById('contents')!.style.height = contentsHeight + 'px';

  const contentsFrame = document.getElementById('contentsFrame') as HTMLElement;
  if (contentsFrame) {
    const width =
      cardStore.getState().sketch.geometry.width -
      cardCssStyle.borderWidth * 2 -
      shadowWidth;
    const height =
      cardStore.getState().sketch.geometry.height -
      cardCssStyle.borderWidth * 2 -
      shadowHeight -
      document.getElementById('title')!.offsetHeight;

    const innerWidth =
      width / cardStore.getState().sketch.style.zoom -
      CARD_MARGIN_LEFT * 2 -
      CARD_PADDING * 2;
    //        - CARD_SCROLLBAR_WIDTH * cardStore.getState().sketch.style.zoom;
    const innerHeight =
      height / cardStore.getState().sketch.style.zoom -
      CARD_MARGIN_TOP * 2 -
      CARD_PADDING * 2;

    contentsFrame.style.width = innerWidth + 'px';
    contentsFrame.style.height = innerHeight + 'px';
  }

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

// eslint-disable-next-line complexity
const renderCardStyle = () => {
  /**
   * The card cannot be moved by mouse when #title is hidden.
   * When hidden, #title changes to visible at the first mouse down.
   * It can be moved by mouse after the second mouse down.
   * So, the user need to click twice when #title is hidden.
   * Use opacity instead of visible/hidden.
  document.getElementById('title')!.style.visibility = 'visible';
  if (cardPropStatus.style.opacity === 0 && cardPropStatus.status === 'Blurred') {
    document.getElementById('title')!.style.visibility = 'hidden';
  }
   */
  document.getElementById('title')!.style.opacity = '1.0';
  if (
    cardStore.getState().sketch.style.opacity === 0 &&
    cardStore.getState().workState.status === 'Blurred'
  ) {
    document.getElementById('title')!.style.opacity = '0.01';
  }

  // Set card properties
  const backgroundRgba = convertHexColorToRgba(
    cardStore.getState().sketch.style.backgroundColor,
    cardStore.getState().sketch.style.opacity
  );
  document.getElementById('contents')!.style.backgroundColor = backgroundRgba;
  const darkerRgba = convertHexColorToRgba(
    darkenHexColor(cardStore.getState().sketch.style.backgroundColor),
    cardStore.getState().sketch.style.opacity
  );

  const uiRgba = convertHexColorToRgba(cardStore.getState().sketch.style.uiColor);

  document.getElementById('title')!.style.backgroundColor = uiRgba;

  if (cardStore.getState().workState.status === 'Focused') {
    document.getElementById(
      'card'
    )!.style.border = `${cardCssStyle.borderWidth}px solid ${uiRgba}`;
  }
  else if (cardStore.getState().workState.status === 'Blurred') {
    document.getElementById(
      'card'
    )!.style.border = `${cardCssStyle.borderWidth}px solid transparent`;
  }

  let boxShadow = 'none';
  if (
    cardStore.getState().sketch.style.opacity !== 0 &&
    cardStore.getState().workState.status !== 'Focused'
  ) {
    boxShadow = '5px 5px 3px 0px rgba(128,128,128, .2)';
  }
  if (cardStore.getState().workState.status === 'Focused') {
    boxShadow = '5px 5px 3px 0px rgba(0,0,0, .2)';
  }
  document.getElementById('card')!.style.boxShadow = boxShadow;

  const scrollBarRgba = convertHexColorToRgba(
    darkenHexColor(cardStore.getState().sketch.style.backgroundColor, 0.85)
  );

  // eslint-disable-next-line no-useless-catch
  /*
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

      // @ts-ignore
      iframeDoc.body.style.zoom = `${cardStore.getState().sketch.style.zoom}`;
    }
  } catch (e) {
    console.error(e);
  }] */
  const contentsFrame = document.getElementById('contentsFrame') as HTMLElement;
  // @ts-ignore
  contentsFrame.style.zoom = `${cardStore.getState().sketch.style.zoom}`;

  const style = window.document.createElement('style');
  style.innerHTML =
    '#contents::-webkit-scrollbar { background-color: ' +
    backgroundRgba +
    '}\n' +
    '#contents::-webkit-scrollbar-thumb { background-color: ' +
    scrollBarRgba +
    '}';
  window.document.head.appendChild(style);
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

// eslint-disable-next-line complexity
export const render = (
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

    if (cardStore.getState().body._id !== '') {
      renderContentsData();
      /*
      await renderContentsData().catch(e =>
        console.error('Error in renderContentsData: ' + e)
      );
      */
    }
  }

  if (cardStore.getState().sketch._id === '') return;

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

/*
// eslint-disable-next-line complexity
const dispatch = (event: MessageEvent) => {
  if (
    event.source !== window ||
    event.data.command === undefined ||
    event.data.doc === undefined ||
    event.data.command !== 'reactive-forward'
  )
    return;

  if (!event.data.propertyName) {
    // Update whole document
    const avatar = event.data.doc as CardPropStatus;
    onResizeByHand(avatar.geometry);
    // onMoveByHand(avatar.geometry);

  }
  else if (event.data.propertyName === 'geometry') {
    const geometry = event.data.doc as Geometry;
    if (
      cardPropStatus.geometry.width !== geometry.width ||
      cardPropStatus.geometry.height !== geometry.height
    ) {
      onResizeByHand(geometry, false);
    }

    if (
      cardPropStatus.geometry.x !== geometry.x ||
      cardPropStatus.geometry.y !== geometry.y
    ) {
      cardPropStatus.geometry.x = geometry.x;
      cardPropStatus.geometry.y = geometry.y;
    }

    if (cardPropStatus.geometry.z !== geometry.z) {
      cardPropStatus.geometry.z = geometry.z;
    }
  }
};

// Receive message from Main process via preload
window.addEventListener('message', dispatch);
const cleanup = () => {
  window.removeEventListener('message', dispatch);
};
*/
