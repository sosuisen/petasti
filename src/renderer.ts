/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { ChangedFile } from 'git-documentdb';
import { cardStore } from './modules_renderer/card_store';
import {
  CardBody,
  CardSketch,
  CardStyle,
  Geometry,
  RendererConfig,
} from './modules_common/types';
import {
  CardCssStyle,
  FileDropEvent,
  ICardEditor,
  InnerClickEvent,
} from './modules_common/types_cardeditor';
import {
  DEFAULT_CARD_GEOMETRY,
  DRAG_IMAGE_MARGIN,
  MINIMUM_WINDOW_HEIGHT,
  MINIMUM_WINDOW_HEIGHT_OFFSET,
  MINIMUM_WINDOW_WIDTH,
} from './modules_common/const';
import { CardEditorMarkdown } from './modules_renderer/editor_markdown';
import {
  getRenderOffsetHeight,
  getRenderOffsetWidth,
  initCardRenderer,
  render,
  shadowHeight,
  shadowWidth,
} from './modules_renderer/card_renderer';
import { darkenHexColor } from './modules_common/color';
import { saveCardColor } from './modules_renderer/save';
import window from './modules_renderer/window';
import {
  getShiftDown,
  setAltDown,
  setCtrlDown,
  setMetaDown,
  setShiftDown,
} from './modules_common/keys';
import {
  cardBodyUpdateCreator,
  cardConditionLockedUpdateCreator,
  cardGeometryUpdateCreator,
  cardLabelUpdateCreator,
  cardSketchBringToFrontCreator,
  cardSketchSendToBackCreator,
  cardSketchUpdateCreator,
  cardStyleUpdateCreator,
  cardWorkStateStatusUpdateCreator,
} from './modules_renderer/card_action_creator';
import { ChangeFrom } from './modules_renderer/card_types';
import { setMessages } from './modules_renderer/messages_renderer';
import { setConfig } from './modules_renderer/config';

let sketchUrlEncoded: string;

let cardCssStyle: CardCssStyle = {
  borderWidth: 0,
};

let suppressFocusEvent = false;

const cardEditor: ICardEditor = new CardEditorMarkdown();

const close = () => {
  window.close();
};

let animationId: number | undefined;
const onBodyMouseUp = () => {
  // window.api.windowMoved(cardStore.getState().workState.url);
  document.body!.removeEventListener('mouseup', onBodyMouseUp);
  if (animationId !== undefined) {
    cancelAnimationFrame(animationId);
    animationId = undefined;
    let newGeom: Geometry;
    if (cardStore.getState().sketch.label.enabled) {
      newGeom = {
        ...cardStore.getState().sketch.geometry,
        width: cardStore.getState().sketch.label.width!,
        height: cardStore.getState().sketch.label.height!,
        x: window.screenX,
        y: window.screenY,
      };
    }
    else {
      newGeom = {
        ...cardStore.getState().sketch.geometry,
        x: window.screenX,
        y: window.screenY,
      };
    }
    cardStore.dispatch(cardGeometryUpdateCreator(newGeom));
  }
};

/**
 * Initialize
 */
const initializeUIEvents = () => {
  document.addEventListener('keydown', e => {
    setShiftDown(e.shiftKey);
    setCtrlDown(e.ctrlKey);
    setAltDown(e.altKey);
    setMetaDown(e.metaKey); // Windows key, Command key
    render(['TitleBar']);
  });

  document.addEventListener('keyup', e => {
    setShiftDown(e.shiftKey);
    setCtrlDown(e.ctrlKey);
    setAltDown(e.altKey);
    setMetaDown(e.metaKey); // Windows key, Command key
    render(['TitleBar']);
  });

  document.addEventListener('dragover', e => {
    e.preventDefault();
    return false;
  });

  document.getElementById('contents')!.addEventListener('mousedown', event => {
    startEditorByClick({ x: event.clientX, y: event.clientY } as InnerClickEvent);
  });

  // eslint-disable-next-line no-unused-expressions
  document.getElementById('newBtn')?.addEventListener('click', async () => {
    // Position of a new card is relative to this card.

    const geometry = { ...DEFAULT_CARD_GEOMETRY };
    geometry.x = cardStore.getState().sketch.geometry.x + 30;
    geometry.y = cardStore.getState().sketch.geometry.y + 30;
    if (getShiftDown()) {
      geometry.width = cardStore.getState().sketch.geometry.width;
      geometry.height = cardStore.getState().sketch.geometry.height;
    }
    const cardBody: Partial<CardBody> = {};
    const cardSketch: Partial<CardSketch> = {
      geometry: {
        x: geometry.x,
        y: geometry.y,
        z: geometry.z, // z will be overwritten in createCard()
        width: geometry.width,
        height: geometry.height,
      },
      style: {
        uiColor: cardStore.getState().sketch.style.uiColor,
        backgroundColor: cardStore.getState().sketch.style.backgroundColor,
        opacity: cardStore.getState().sketch.style.opacity,
        zoom: cardStore.getState().sketch.style.zoom,
      },
    };
    await window.api.createCard(undefined, cardBody, cardSketch);
  });

  document.getElementById('pinBtn')?.addEventListener('click', async event => {
    const label = cardStore.getState().sketch.label;
    if (cardStore.getState().sketch.label.pinned) {
      label.pinned = false;
    }
    else {
      label.pinned = true;
    }
    await cardStore.dispatch(cardLabelUpdateCreator(label));
    render(['TitleBar']);
  });

  /*
  // eslint-disable-next-line no-unused-expressions
  document.getElementById('codeBtn')?.addEventListener('click', () => {
    cardEditor.toggleCodeMode();
  });
  */
  // eslint-disable-next-line no-unused-expressions
  document.getElementById('closeBtn')?.addEventListener('click', async event => {
    if (cardEditor.isOpened) {
      cardEditor.hideEditor();
      await cardEditor.endEdit();
      render(['TitleBar', 'ContentsData', 'ContentsRect']);
    }

    if (cardStore.getState().body._body === '' || event.ctrlKey) {
      window.api.deleteCard(cardStore.getState().workState.url);
    }
    else {
      suppressFocusEvent = true; // Suppress focus event in order not to focus and save this card just after closing card window.
      window.api.deleteCardSketch(cardStore.getState().workState.url);
      /**
       * Don't use window.confirm(MESSAGE.confirm_closing)
       * It disturbs correct behavior of CKEditor.
       * Caret of CKEditor is disappeared just after push Cancel button of window.confirm()
       */
      /*
      window.api
        .confirmDialog(
          cardStore.getState().url,
          ['btnCloseCard', 'btnCancel'],
          'confirmClosing'
        )
        .then((res: number) => {
          if (res === DIALOG_BUTTON.ok) {
            // OK
            suppressFocusEvent = true; // Suppress focus event in order not to focus and save this card just after closing card window.
            deleteCardSketch(cardPropStatus);
          }
          else if (res === DIALOG_BUTTON.cancel) {
            // Cancel
          }
        })
        .catch((e: Error) => {
          console.error(e.message);
        });
      */
    }
  });

  /*
  let prevMouseX: number;
  let prevMouseY: number;
  let isHorizontalMoving = false;
  let isVerticalMoving = false;

  const onmousemove = (event: MouseEvent) => {
    // let newWidth = cardStore.getState().sketch.geometry.width + getRenderOffsetWidth();
    // let newHeight = cardStore.getState().sketch.geometry.height + getRenderOffsetHeight();
    let newWidth = window.outerWidth;
    let newHeight = window.outerHeight;
    if (isHorizontalMoving) {
      newWidth += event.screenX - prevMouseX;
    }
    if (isVerticalMoving) {
      newHeight += event.screenY - prevMouseY;
    }
    prevMouseX = event.screenX;
    prevMouseY = event.screenY;

    if (newWidth < MINIMUM_WINDOW_WIDTH) {
      newWidth = MINIMUM_WINDOW_WIDTH;
    }

    if (newHeight < MINIMUM_WINDOW_HEIGHT) {
      newHeight = MINIMUM_WINDOW_HEIGHT;
    }

    if (isHorizontalMoving || isVerticalMoving) {
      const newGeom = {
        ...cardStore.getState().sketch.geometry,
        width: newWidth,
        height: newHeight,
      };
      console.log('# resize on renderer');
      // window.resizeTo method cannot change width/height value to be less than 100.
      if (newWidth < 100 || newHeight < 100) {
        window.api.setWindowRect(
          cardStore.getState().workState.url,
          cardStore.getState().sketch.geometry.x,
          cardStore.getState().sketch.geometry.y,
          newWidth,
          newHeight
        );
      }
      else {
        window.resizeTo(newWidth, newHeight); // set outerWidth and outerHeight
      }
      onResizeByHand(newGeom);
    }
  };
  window.addEventListener('mousemove', onmousemove);
  window.addEventListener('mouseup', event => {
    isHorizontalMoving = false;
    isVerticalMoving = false;
    document.getElementById('windowMask')!.style.display = 'none';
  });
  */
  window.addEventListener('mouseleave', event => {});

  /*
  document.getElementById('resizeAreaRight')!.addEventListener('mousedown', event => {
    isHorizontalMoving = true;
    document.getElementById('windowMask')!.style.display = 'block';
    prevMouseX = event.screenX;
    prevMouseY = event.screenY;
  });

  document.getElementById('resizeAreaBottom')!.addEventListener('mousedown', event => {
    isVerticalMoving = true;
    document.getElementById('windowMask')!.style.display = 'block';
    prevMouseX = event.screenX;
    prevMouseY = event.screenY;
  });

  document.getElementById('resizeAreaRightBottom')!.addEventListener('mousedown', event => {
    isVerticalMoving = true;
    isHorizontalMoving = true;
    document.getElementById('windowMask')!.style.display = 'block';
    prevMouseX = event.screenX;
    prevMouseY = event.screenY;
  });
  */

  let mouseOffsetX: number;
  let mouseOffsetY: number;
  const moveWindow = () => {
    window.api.windowMoving(cardStore.getState().workState.url, {
      mouseOffsetX,
      mouseOffsetY,
    });
    animationId = requestAnimationFrame(moveWindow);
  };
  document.getElementById('titleBar')!.addEventListener('mousedown', event => {
    if (!cardStore.getState().sketch.label.enabled) {
      onBodyMouseUp();
      mouseOffsetX = event.clientX;
      mouseOffsetY = event.clientY;
      document.body!.addEventListener('mouseup', onBodyMouseUp);
      requestAnimationFrame(moveWindow);
      event.preventDefault();
    }
  });

  document.body!.addEventListener('mousedown', event => {
    if (cardStore.getState().sketch.label.enabled) {
      onBodyMouseUp();
      mouseOffsetX = event.clientX;
      mouseOffsetY = event.clientY;
      document.body!.addEventListener('mouseup', onBodyMouseUp);
      requestAnimationFrame(moveWindow);
      event.preventDefault();
    }
  });

  document.getElementById('title')!.addEventListener('dblclick', event => {
    if (!cardStore.getState().sketch.label.enabled) {
      onBodyMouseUp();
      onTransformToLabel();
      event.preventDefault();
      event.stopPropagation();
    }
  });

  document.body!.addEventListener('dblclick', event => {
    if (cardStore.getState().sketch.label.enabled) {
      onBodyMouseUp();
      onTransformFromLabel();
      event.preventDefault();
      event.stopPropagation();
    }
  });
};

const onload = async () => {
  window.removeEventListener('load', onload, false);

  const url = window.location.search;
  const arr = url.slice(1).split('&');
  const params: { [key: string]: string } = {};
  for (let i = 0; i < arr.length; i++) {
    const pair = arr[i].split('=');
    params[pair[0]] = pair[1];
  }
  sketchUrlEncoded = params.sketchUrl;
  if (!sketchUrlEncoded) {
    console.error('id parameter is not given in URL');
    return;
  }

  cardCssStyle = {
    borderWidth: parseInt(
      window.getComputedStyle(document.getElementById('card')!).borderLeft,
      10
    ),
  };

  initializeUIEvents();

  //  await Promise.all([cardEditor.loadUI(cardCssStyle), waitIframeInitializing()]).catch(
  await cardEditor.loadUI(cardCssStyle).catch(e => {
    console.error(e.message);
  });

  // initializeContentsFrameEvents();

  window.api.finishLoad(sketchUrlEncoded);
};

// eslint-disable-next-line complexity
window.addEventListener('message', event => {
  if (event.source !== window || !event.data.command) return;

  switch (event.data.command) {
    case 'card-blurred':
      onCardBlurred();
      break;
    case 'card-close':
      onCardClose();
      break;
    case 'card-focused':
      onCardFocused(event.data.zIndex, event.data.modifiedDate);
      break;
    case 'change-card-color':
      onChangeCardColor(event.data.backgroundColor, event.data.opacity);
      break;
    case 'move-by-hand':
      onMoveByHand(event.data.geometry, event.data.modifiedDate, 'remote');
      break;
    case 'render-card':
      onRenderCard(
        event.data.sketchUrl,
        event.data.cardBody,
        event.data.cardSketch,
        event.data.config
      );
      break;
    case 'resize-by-hand':
      console.log('# resize on main: ' + JSON.stringify(event.data.geometry));
      onResizeByHand(event.data.geometry);
      break;
    case 'send-to-back':
      onSendToBack(event.data.zIndex, event.data.modifiedDate);
      break;
    case 'set-lock':
      onSetLock(event.data.locked);
      break;
    case 'zoom-in':
      onZoomIn();
      break;
    case 'zoom-out':
      onZoomOut();
      break;
    case 'sync-card-sketch':
      onSyncCardSketch(event.data.changedFile, event.data.enqueueTime);
      break;
    case 'sync-card-body':
      onSyncCardBody(event.data.changedFile, event.data.enqueueTime);
      break;
    case 'transform-to-label':
      onTransformToLabel();
      break;
    case 'transform-from-label':
      onTransformFromLabel();
      break;
    default:
      break;
  }
});

const onTransformToLabel = async () => {
  if (cardEditor.isOpened) {
    await endEditor();
  }
  const html = cardEditor.getHTML();
  const paragraphs = html.split('</p>');
  let labelText = '';
  if (paragraphs.length > 0) labelText = paragraphs[0] + '</p>';
  const label = cardStore.getState().sketch.label;
  label.enabled = true;
  label.text = labelText;
  if (label.x === undefined) {
    label.x = cardStore.getState().sketch.geometry.x;
  }
  if (label.y === undefined) {
    label.y = cardStore.getState().sketch.geometry.y;
  }
  if (label.width === undefined) {
    label.width = cardStore.getState().sketch.geometry.width;
  }
  if (label.height === undefined) {
    label.height = MINIMUM_WINDOW_HEIGHT + MINIMUM_WINDOW_HEIGHT_OFFSET;
  }
  // Not pinned
  label.x = cardStore.getState().sketch.geometry.x;
  label.y = cardStore.getState().sketch.geometry.y;

  // TODO: pinned

  await cardStore.dispatch(cardLabelUpdateCreator(label));

  if (
    cardStore.getState().sketch.label.height! < cardStore.getState().sketch.geometry.height
  ) {
    // Wait for the card to shrink.
    await window.api.setWindowRect(
      cardStore.getState().workState.url,
      label.x,
      label.y,
      label.width,
      label.height
    );
    render();
  }
  else {
    render();
    window.api.setWindowRect(
      cardStore.getState().workState.url,
      label.x,
      label.y,
      label.width,
      label.height
    );
  }
};

const onTransformFromLabel = async () => {
  const label = cardStore.getState().sketch.label;
  label.enabled = false;
  label.text = '';
  await cardStore.dispatch(cardLabelUpdateCreator(label));

  // Not pinned
  const newGeom: Geometry = {
    x: Math.round(label.x!),
    y: Math.round(label.y!),
    z: cardStore.getState().sketch.geometry.z,
    width: cardStore.getState().sketch.geometry.width,
    height: cardStore.getState().sketch.geometry.height,
  };
  await cardStore.dispatch(cardGeometryUpdateCreator(newGeom));

  // TODO: pinned

  if (
    cardStore.getState().sketch.geometry.height < cardStore.getState().sketch.label.height!
  ) {
    // Label is larger than card. It is rare case.
    // Wait for the card to shrink.
    await window.api.setWindowRect(
      cardStore.getState().workState.url,
      cardStore.getState().sketch.geometry.x,
      cardStore.getState().sketch.geometry.y,
      cardStore.getState().sketch.geometry.width,
      cardStore.getState().sketch.geometry.height
    );
    render();
  }
  else {
    render();
    window.api.setWindowRect(
      cardStore.getState().workState.url,
      cardStore.getState().sketch.geometry.x,
      cardStore.getState().sketch.geometry.y,
      cardStore.getState().sketch.geometry.width,
      cardStore.getState().sketch.geometry.height
    );
  }
};

const onResizeByHand = async (geometry: Geometry) => {
  const newGeom: Geometry = {
    x: Math.round(geometry.x),
    y: Math.round(geometry.y),
    z: cardStore.getState().sketch.geometry.z,
    width: Math.round(geometry.width - getRenderOffsetWidth()),
    height: Math.round(geometry.height - getRenderOffsetHeight()),
  };
  await cardStore.dispatch(cardGeometryUpdateCreator(newGeom));
  console.log('# render: ' + JSON.stringify(cardStore.getState().sketch));
  render(['TitleBar', 'ContentsRect', 'EditorRect']);
};

const onCardClose = async () => {
  if (cardEditor.isOpened) {
    await endEditor();
  }
  close();
};

const onCardFocused = (zIndex: number | undefined, modifiedDate: string | undefined) => {
  if (suppressFocusEvent) {
    return;
  }
  cardStore.dispatch(cardSketchBringToFrontCreator(zIndex, modifiedDate));

  render(['TitleBar', 'TitleBarStyle', 'CardStyle', 'ContentsRect']);

  if (!cardEditor.isOpened) {
    startEditor();
  }
};

const onCardBlurred = () => {
  onBodyMouseUp();

  cardStore.dispatch(cardWorkStateStatusUpdateCreator('Blurred'));

  render(['TitleBar', 'TitleBarStyle', 'CardStyle', 'ContentsRect']);

  if (cardEditor.isOpened) {
    if (cardEditor.isCodeMode) {
      return;
    }
    endEditor();
  }
};

const onChangeCardColor = (backgroundColor: string, opacity = 1.0) => {
  const uiColor = darkenHexColor(backgroundColor);
  saveCardColor(backgroundColor, uiColor, opacity);
  render(['CardStyle', 'TitleBarStyle', 'EditorStyle']);
};

const onMoveByHand = (geometry: Geometry, modifiedDate: string, changeFrom: ChangeFrom) => {
  let currentX, currentY, currentZ, currentWidth, currentHeight: number;
  if (cardStore.getState().sketch.label.enabled) {
    currentX = cardStore.getState().sketch.label.x!;
    currentY = cardStore.getState().sketch.label.y!;
    currentZ = cardStore.getState().sketch.geometry.z;
    currentWidth = cardStore.getState().sketch.label.width!;
    currentHeight = cardStore.getState().sketch.label.height!;
  }
  else {
    currentX = cardStore.getState().sketch.geometry.x;
    currentY = cardStore.getState().sketch.geometry.y;
    currentZ = cardStore.getState().sketch.geometry.z;
    currentWidth = cardStore.getState().sketch.geometry.width;
    currentHeight = cardStore.getState().sketch.geometry.height;
  }
  if (currentX !== geometry.x || currentY !== geometry.y) {
    const newGeom: Geometry = {
      x: Math.round(geometry.x),
      y: Math.round(geometry.y),
      z: currentZ,
      width: currentWidth,
      height: currentHeight,
    };
    cardStore.dispatch(cardGeometryUpdateCreator(newGeom, modifiedDate, changeFrom));
  }
};

// Render card data
const onRenderCard = async (
  url: string,
  cardBody: CardBody,
  cardSketch: CardSketch,
  config: RendererConfig
) => {
  setConfig(config);
  setMessages(config.messages);

  cardStore.dispatch({
    type: 'card-body-init',
    payload: cardBody,
  });
  cardStore.dispatch({
    type: 'card-geometry-init',
    payload: cardSketch.geometry,
  });
  cardStore.dispatch({
    type: 'card-style-init',
    payload: cardSketch.style,
  });
  cardStore.dispatch({
    type: 'card-condition-init',
    payload: cardSketch.condition,
  });
  cardStore.dispatch({
    type: 'card-label-init',
    payload: cardSketch.label,
  });
  cardStore.dispatch({
    type: 'card-sketch-date-init',
    payload: cardSketch.date,
  });
  cardStore.dispatch({
    type: 'card-sketch-id-init',
    payload: cardSketch._id,
  });
  cardStore.dispatch({
    type: 'card-work-state-init',
    payload: {
      url,
      status: 'Blurred',
    },
  });

  initCardRenderer(cardCssStyle, cardEditor);

  await cardEditor.createEditor();
  await cardEditor.setData(cardStore.getState().body._body);

  document.getElementById('card')!.style.visibility = 'visible';

  render();
  /*  
    .then(() => {
      const iframe = document.getElementById('contentsFrame') as HTMLIFrameElement;
      // Listen load event for reload()
      iframe.addEventListener('load', e => {
        render(['ContentsData', 'CardStyle']);
      });
    })
    .catch(e => {
      console.error(`Error in render-card: ${e.message}`);
    });
    */

  window.api.finishRenderCard(cardStore.getState().workState.url).catch((e: Error) => {
    // logger.error does not work in ipcRenderer event.
    console.error(`Error in render-card: ${e.message}`);
  });
};

const onSendToBack = (zIndex: number, modifiedDate: string) => {
  cardStore.dispatch(cardSketchSendToBackCreator(zIndex, modifiedDate));
};

const onSetLock = (locked: boolean) => {
  cardStore.dispatch(cardConditionLockedUpdateCreator(locked));
  if (cardEditor.isOpened) {
    endEditor();
  }
};

const onZoomIn = async () => {
  const newStyle: CardStyle = { ...cardStore.getState().sketch.style };
  if (newStyle.zoom < 1.0) {
    newStyle.zoom += 0.15;
  }
  else {
    newStyle.zoom += 0.3;
  }
  if (newStyle.zoom > 3) {
    newStyle.zoom = 3;
  }
  await cardStore.dispatch(cardStyleUpdateCreator(newStyle));
  render(['CardStyle', 'EditorStyle']);
};

const onZoomOut = async () => {
  const newStyle: CardStyle = { ...cardStore.getState().sketch.style };
  if (newStyle.zoom <= 1.0) {
    newStyle.zoom -= 0.15;
  }
  else {
    newStyle.zoom -= 0.3;
  }
  if (newStyle.zoom <= 0.55) {
    newStyle.zoom = 0.55;
  }
  await cardStore.dispatch(cardStyleUpdateCreator(newStyle));
  render(['CardStyle', 'EditorStyle']);
};

const onSyncCardSketch = async (changedFile: ChangedFile, enqueueTime: string) => {
  if (changedFile.operation === 'insert') {
    // It is not invoked.
  }
  else if (changedFile.operation === 'update') {
    const cardSketch = changedFile.new.doc as CardSketch;
    await cardStore.dispatch(cardSketchUpdateCreator(cardSketch, 'remote', enqueueTime));

    render(['TitleBar', 'ContentsRect', 'CardStyle', 'EditorStyle', 'EditorRect']);
  }
  else if (changedFile.operation === 'delete') {
    // It is not invoked.
  }
};

const onSyncCardBody = async (changedFile: ChangedFile, enqueueTime: string) => {
  if (changedFile.operation === 'insert') {
    // It will be not occurred.

    const cardBody = changedFile.new.doc as CardBody;
    await cardStore.dispatch(cardBodyUpdateCreator(cardBody._body, 'remote', enqueueTime));
  }
  else if (changedFile.operation === 'update') {
    const cardBody = changedFile.new.doc as CardBody;
    await cardStore.dispatch(cardBodyUpdateCreator(cardBody._body, 'remote', enqueueTime));
  }
  else if (changedFile.operation === 'delete') {
    await cardStore.dispatch(cardBodyUpdateCreator('', 'remote', enqueueTime));
  }
  cardEditor.skipSave = true;
  cardEditor.setData(cardStore.getState().body._body);
  render(['ContentsData', 'CardStyle']);
};

const startEditor = (x?: number, y?: number) => {
  if (cardStore.getState().sketch.condition.locked) {
    return;
  }
  if (cardStore.getState().sketch.label.enabled) {
    return;
  }

  cardEditor.showEditor();

  const contents = document.getElementById('contents');
  const scrollTop = contents!.scrollTop;
  const scrollLeft = contents!.scrollLeft;

  cardEditor.setScrollPosition(scrollLeft, scrollTop);

  cardEditor.startEdit();
  if (x !== undefined && y !== undefined) {
    // setInterval(() => {
    //  window.api.sendLeftMouseDown(cardStore.getState().workState.url, x, y);
    // }, 0);
    // window.api.sendLeftMouseClick(cardStore.getState().workState.url, x, y);
  }
};

const endEditor = async () => {
  await cardEditor.endEdit(); // body will be saved in endEdit()
  render();

  const { left, top } = cardEditor.getScrollPosition();
  const contents = document.getElementById('contents');
  contents!.scrollTop = top;
  contents!.scrollLeft = left;
  cardEditor.hideEditor();
};

const startEditorByClick = (clickEvent: InnerClickEvent) => {
  startEditor(clickEvent.x, clickEvent.y);
};

const addDroppedImage = async (fileDropEvent: FileDropEvent) => {
  const uuid: string = await window.api.getUuid();
  /*
   * Must sanitize params from iframe
   * - fileDropEvent.path is checked whether it is correct path or not
   *   by using dropImg.src = fileDropEvent.path;
   *   Incorrect path cannot be loaded.
   * - Break 'onXXX=' event format in fileDropEvent.name by replacing '=' with '-'.
   */
  fileDropEvent.name = fileDropEvent.name.replace('=', '-');

  const dropImg = new Image();

  dropImg.addEventListener('load', async () => {
    let imageOnly = false;
    if (cardStore.getState().body._body === '') {
      imageOnly = true;
    }
    const width = dropImg.naturalWidth;
    const height = dropImg.naturalHeight;

    let newImageWidth =
      cardStore.getState().sketch.geometry.width -
      (imageOnly ? DRAG_IMAGE_MARGIN : 0) -
      cardCssStyle.borderWidth * 2;

    let newImageHeight = height;
    if (newImageWidth < width) {
      newImageHeight = (height * newImageWidth) / width;
    }
    else {
      newImageWidth = width;
    }

    newImageWidth = Math.floor(newImageWidth);
    newImageHeight = Math.floor(newImageHeight);

    const imgTag = cardEditor.getImageTag(
      uuid,
      fileDropEvent.path,
      newImageWidth,
      newImageHeight,
      fileDropEvent.name
    );

    const windowWidth =
      newImageWidth + DRAG_IMAGE_MARGIN + cardCssStyle.borderWidth * 2 + shadowWidth;
    const geometryWidth = windowWidth - getRenderOffsetWidth();
    const windowHeight =
      newImageHeight +
      DRAG_IMAGE_MARGIN +
      document.getElementById('title')!.offsetHeight +
      cardCssStyle.borderWidth * 2 +
      shadowHeight;
    const geometryHeight = windowHeight - getRenderOffsetHeight();

    if (imageOnly) {
      const newGeom = {
        ...cardStore.getState().sketch.geometry,
        height: geometryHeight,
      };
      const newStyle: CardStyle = {
        backgroundColor: '#ffffff',
        uiColor: '#ffffff',
        opacity: 0.0,
        zoom: cardStore.getState().sketch.style.zoom,
      };

      const newSketch: CardSketch = {
        geometry: newGeom,
        style: newStyle,
        condition: { ...cardStore.getState().sketch.condition },
        label: { ...cardStore.getState().sketch.label },
        date: { ...cardStore.getState().sketch.date },
        _id: cardStore.getState().sketch._id,
      };

      await cardStore.dispatch(cardSketchUpdateCreator(newSketch));
      await cardStore.dispatch(cardBodyUpdateCreator(imgTag));
    }
    else {
      const newGeom = {
        ...cardStore.getState().sketch.geometry,
      };
      newGeom.height += newImageHeight;
      await cardStore.dispatch(cardGeometryUpdateCreator(newGeom));
      await cardStore.dispatch(
        cardBodyUpdateCreator(cardStore.getState().body._body + '<br />' + imgTag)
      );
    }

    await window.api.setWindowRect(
      cardStore.getState().workState.url,
      cardStore.getState().sketch.geometry.x,
      cardStore.getState().sketch.geometry.y,
      cardStore.getState().sketch.geometry.width,
      cardStore.getState().sketch.geometry.height
    );

    render(['TitleBar', 'CardStyle', 'ContentsData', 'ContentsRect']);

    window.api.focus(cardStore.getState().workState.url);
    cardEditor.showEditor();
    cardEditor.startEdit();
  });

  dropImg.src = fileDropEvent.path;
};

window.addEventListener('load', onload, false);
window.addEventListener('beforeunload', async e => {});

// Remove APIs
const disableAPIList = ['open', 'alert', 'confirm', 'prompt', 'print'];
disableAPIList.forEach(prop => {
  // @ts-ignore
  window[prop] = () => {
    console.error(prop + ' is disabled.');
  };
});
