/**
 * TreeStickies
 * © 2022 Hidekazu Kubota
 */

import { CardCssStyle, ICardEditor } from '../modules_common/types_cardeditor';
import {
  convertHexColorToRgba,
  darkenHexColor,
  strengthenHexColor,
} from '../modules_common/color';
import window from './window';
import { getCtrlDown } from '../modules_common/keys';
import { cardStore } from './card_store';
import { CARD_MARGIN_LEFT, CARD_MARGIN_TOP, CARD_PADDING } from '../modules_common/const';
import { getConfig } from './config';
import { isLabelOpened } from '../modules_common/utils';

let cardCssStyle: CardCssStyle;
let cardEditor: ICardEditor;

export const shadowHeight = 5;
export const shadowWidth = 5;

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

// eslint-disable-next-line complexity
const renderTitleBar = () => {
  let geomWidth;
  let geomHeight;

  /**
   * The card cannot be moved by mouse when #title is hidden.
   * When hidden, #title changes to visible at the first mouse down.
   * It can be moved by mouse after the second mouse down.
   * So, the user need to click twice when #title is hidden.
   * Use opacity instead of visible/hidden.
   * 
   * But this may be old info because we do not use -webkit-app-region: drag to move window now.
   * 
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

  let titleWidth;
  let titleBarRight;
  const stickerBtn = document.getElementById('stickerBtn')!;
  const stickerIconOn = document.getElementById('stickerIconOn')!;
  const stickerIconOff = document.getElementById('stickerIconOff')!;
  const newBtn = document.getElementById('newBtn')!;
  if (isLabelOpened(cardStore.getState().sketch.label.status)) {
    geomWidth = cardStore.getState().sketch.label.width!;
    titleWidth = geomWidth - cardCssStyle.borderWidth * 2 - shadowWidth;
    geomHeight = cardStore.getState().sketch.label.height!;
    if (newBtn.classList.contains('showWithAnime')) {
      newBtn.classList.remove('showWithAnime');
    }
    if (!newBtn.classList.contains('hideWithAnime')) {
      newBtn.classList.add('hideWithAnime');
    }

    document.getElementById('closeBtn')!.style.display = 'none';

    if (cardStore.getState().sketch.label.status === 'openedSticker') {
      if (stickerIconOn.classList.contains('hideWithAnime')) {
        stickerIconOn.classList.remove('hideWithAnime');
      }
      if (!stickerIconOn.classList.contains('showWithAnime')) {
        stickerIconOn.classList.add('showWithAnime');
      }
      if (stickerIconOff.classList.contains('showWithAnime')) {
        stickerIconOff.classList.remove('showWithAnime');
      }
      if (!stickerIconOff.classList.contains('hideWithAnime')) {
        stickerIconOff.classList.add('hideWithAnime');
      }
    }
    else {
      if (stickerIconOff.classList.contains('hideWithAnime')) {
        stickerIconOff.classList.remove('hideWithAnime');
      }
      if (!stickerIconOff.classList.contains('showWithAnime')) {
        stickerIconOff.classList.add('showWithAnime');
      }
      if (stickerIconOn.classList.contains('showWithAnime')) {
        stickerIconOn.classList.remove('showWithAnime');
      }
      if (!stickerIconOn.classList.contains('hideWithAnime')) {
        stickerIconOn.classList.add('hideWithAnime');
      }
    }

    stickerBtn.style.visibility = 'visible';

    document.getElementById('stickerBtn')!.style.top =
      document.getElementById('newBtn')!.offsetTop + 'px';
    document.getElementById('stickerBtn')!.style.left =
      document.getElementById('newBtn')!.offsetLeft + 'px';
    titleBarRight = titleWidth;
  }
  else {
    geomWidth = cardStore.getState().sketch.geometry.width;
    titleWidth = geomWidth - cardCssStyle.borderWidth * 2 - shadowWidth;
    geomHeight = cardStore.getState().sketch.geometry.height;
    if (newBtn.classList.contains('hideWithAnime')) {
      newBtn.classList.remove('hideWithAnime');
    }
    if (!newBtn.classList.contains('showWithAnime')) {
      newBtn.classList.add('showWithAnime');
    }

    document.getElementById('closeBtn')!.style.display = 'block';

    stickerBtn.style.visibility = 'hidden';
    if (stickerIconOn.classList.contains('showWithAnime')) {
      stickerIconOn.classList.remove('showWithAnime');
    }
    if (!stickerIconOn.classList.contains('hideWithAnime')) {
      stickerIconOn.classList.add('hideWithAnime');
    }
    if (stickerIconOff.classList.contains('showWithAnime')) {
      stickerIconOff.classList.remove('showWithAnime');
    }
    if (!stickerIconOff.classList.contains('hideWithAnime')) {
      stickerIconOff.classList.add('hideWithAnime');
    }

    const closeBtnLeft = titleWidth - document.getElementById('closeBtn')!.offsetWidth;
    document.getElementById('closeBtn')!.style.left = closeBtnLeft + 'px';
    titleBarRight = closeBtnLeft;
  }
  document.getElementById('title')!.style.width = titleWidth + 'px';

  if (getCtrlDown() || cardStore.getState().body._body === '') {
    document.getElementById('closeIcon')!.className = 'far fa-trash-alt title-btn-icon';
  }
  else {
    document.getElementById('closeIcon')!.className = 'fas fa-check title-btn-icon';
  }

  const titleBarLeft =
    document.getElementById('newBtn')!.offsetLeft +
    document.getElementById('newBtn')!.offsetWidth;
  const barWidth = titleBarRight - titleBarLeft;
  document.getElementById('titleBar')!.style.left = titleBarLeft + 'px';
  document.getElementById('titleBar')!.style.width = barWidth + 'px';

  /*
  if (cardEditor.isOpened && cardEditor.hasCodeMode) {
    document.getElementById('codeBtn')!.style.visibility = 'visible';
  }
  else {
    document.getElementById('codeBtn')!.style.visibility = 'hidden';
  }
  */
  /**
   * TODO: Update title when cardPropStatus.data changes
   */
  setWindowTitle();
};

const renderTitleBarStyle = () => {
  const darkerColor = strengthenHexColor(cardStore.getState().sketch.style.uiColor, 0.7);

  document.getElementById('newBtn')!.style.color = darkerColor;
  document.getElementById('closeBtn')!.style.color = darkerColor;
  document.getElementById('stickerBtn')!.style.color = darkerColor;

  if (isLabelOpened(cardStore.getState().sketch.label.status)) {
    const backgroundRgba = convertHexColorToRgba(
      cardStore.getState().sketch.style.backgroundColor,
      cardStore.getState().sketch.style.opacity
    );
    document.getElementById('title')!.style.backgroundColor = backgroundRgba;
  }
  else {
    const titleRgba = convertHexColorToRgba(
      strengthenHexColor(cardStore.getState().sketch.style.uiColor),
      0.6
    );
    document.getElementById('title')!.style.backgroundColor = titleRgba;
  }

  /*
  if (cardEditor.isCodeMode) {
    document.getElementById('codeBtn')!.style.color = '#ff0000';
  }
  else {
    document.getElementById('codeBtn')!.style.color = darkerColor;
  }
  */
};

const renderContentsData = async (): Promise<void> => {
  if (isLabelOpened(cardStore.getState().sketch.label.status)) {
    const text = cardStore.getState().sketch.label.text ?? '';
    document.getElementById('labelFrame')!.innerHTML = text;
  }
  else {
    document.getElementById('contentsFrame')!.innerHTML = await cardEditor.getHTML();
  }
};

const renderCardAndContentsRect = () => {
  let geomWidth;
  let geomHeight;
  if (isLabelOpened(cardStore.getState().sketch.label.status)) {
    geomWidth = cardStore.getState().sketch.label.width!;
    geomHeight = cardStore.getState().sketch.label.height!;
  }
  else {
    geomWidth = cardStore.getState().sketch.geometry.width;
    geomHeight = cardStore.getState().sketch.geometry.height;
  }

  // cardOffset is adjustment for box-shadow
  let cardOffset = 0;
  if (!getConfig().isResident && cardStore.getState().workState.status === 'Blurred') {
    cardOffset = cardCssStyle.borderWidth;
  }
  const cardWidth = geomWidth - cardOffset - shadowWidth;

  const cardHeight = geomHeight - cardOffset - shadowHeight;

  document.getElementById('card')!.style.width = cardWidth + 'px';
  document.getElementById('card')!.style.height = cardHeight + 'px';

  let topOffset = 0;
  let leftOffset = 0;
  let contentsElement: HTMLElement;
  let contentsFrame: HTMLElement;
  let zoom: number;
  if (isLabelOpened(cardStore.getState().sketch.label.status)) {
    leftOffset = document.getElementById('label')!.offsetLeft;
    contentsElement = document.getElementById('label')!;
    contentsFrame = document.getElementById('labelFrame')!;
    zoom = cardStore.getState().sketch.label.zoom!;
  }
  else {
    topOffset = document.getElementById('title')!.offsetHeight;
    contentsElement = document.getElementById('contents')!;
    contentsFrame = document.getElementById('contentsFrame')!;
    zoom = cardStore.getState().sketch.style.zoom;
  }

  // width of BrowserWindow (namely cardPropStatus.geometry.width) equals border + padding + content.
  const contentsWidth = geomWidth - cardCssStyle.borderWidth * 2 - leftOffset - shadowWidth;

  const contentsHeight =
    geomHeight - cardCssStyle.borderWidth * 2 - topOffset - shadowHeight;

  contentsElement.style.width = contentsWidth + 'px';
  contentsElement.style.height = contentsHeight + 'px';

  if (contentsFrame) {
    const width = geomWidth - cardCssStyle.borderWidth * 2 - leftOffset - shadowWidth;
    const height = geomHeight - cardCssStyle.borderWidth * 2 - shadowHeight - topOffset;

    const innerWidth = width / zoom - CARD_MARGIN_LEFT * 2 - CARD_PADDING * 2;
    //        - CARD_SCROLLBAR_WIDTH * cardStore.getState().sketch.style.zoom;
    const innerHeight = height / zoom - CARD_MARGIN_TOP * 2 - CARD_PADDING * 2;

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
  let contentsElement: HTMLElement;
  let contentsFrame: HTMLElement;
  let zoom: number;
  if (isLabelOpened(cardStore.getState().sketch.label.status)) {
    contentsElement = document.getElementById('label')!;
    contentsFrame = document.getElementById('labelFrame')!;
    zoom = cardStore.getState().sketch.label.zoom!;
  }
  else {
    contentsElement = document.getElementById('contents')!;
    contentsFrame = document.getElementById('contentsFrame')!;
    zoom = cardStore.getState().sketch.style.zoom;
  }

  // Set card properties
  const backgroundRgba = convertHexColorToRgba(
    cardStore.getState().sketch.style.backgroundColor,
    cardStore.getState().sketch.style.opacity
  );
  // contentsElement.style.backgroundColor = backgroundRgba;
  document.getElementById('card')!.style.backgroundColor = backgroundRgba;

  const borderRgba = convertHexColorToRgba(
    strengthenHexColor(cardStore.getState().sketch.style.uiColor),
    0.6
  );

  if (cardStore.getState().sketch.style.opacity !== 0) {
    document.getElementById(
      'card'
//    )!.style.border = `${cardCssStyle.borderWidth}px solid ${borderRgba}`;
)!.style.border = `${cardCssStyle.borderWidth}px solid #000000`;
  }
  else {
    document.getElementById(
      'card'
    )!.style.border = `${cardCssStyle.borderWidth}px solid transparent`;
  }

  if (cardStore.getState().workState.status === 'Focused') {
    document.getElementById('card')!.style.opacity = '1.0';
  }
  else if (!getConfig().isResident && cardStore.getState().workState.status === 'Blurred') {
    document.getElementById('card')!.style.opacity = '0.95';
  }

  let boxShadow = 'none';
  if (!getConfig().isResident) {
    if (
      cardStore.getState().sketch.style.opacity !== 0 &&
      cardStore.getState().workState.status !== 'Focused'
    ) {
      boxShadow = '5px 5px 3px 0px rgba(128,128,128, .2)';
    }
    if (cardStore.getState().workState.status === 'Focused') {
      boxShadow = '5px 5px 3px 0px rgba(0,0,0, .2)';
    }
  }
  document.getElementById('card')!.style.boxShadow = boxShadow;

  const scrollBarRgba = convertHexColorToRgba(
    strengthenHexColor(cardStore.getState().sketch.style.backgroundColor, 0.9),
    0.4
  );

  contentsFrame.style.transformOrigin = 'top left';
  contentsFrame.style.transform = `scale(${zoom})`;

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

    if (cardStore.getState().body._id !== '') {
      await renderContentsData();
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
