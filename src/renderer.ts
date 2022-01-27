/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { ChangedFile } from 'git-documentdb';
import { cardStore } from './modules_renderer/card_store';
import {
  CardBody,
  CardLabel,
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
  WINDOW_POSITION_EDGE_MARGIN,
} from './modules_common/const';
import { CardEditorMarkdown } from './modules_renderer/editor_markdown';
import { initCardRenderer, render, shadowHeight } from './modules_renderer/card_renderer';
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
  cardGeometryUpdateCreator,
  cardLabelUpdateCreator,
  cardSketchBringToFrontCreator,
  cardSketchSendToBackCreator,
  cardSketchUpdateCreator,
  cardStyleUpdateCreator,
  cardWorkStateStatusUpdateCreator,
} from './modules_renderer/card_action_creator';
import { setMessages } from './modules_renderer/messages_renderer';
import { setConfig } from './modules_renderer/config';
import { isLabelOpened } from './modules_common/utils';

let sketchUrlEncoded: string;

let cardCssStyle: CardCssStyle = {
  borderWidth: 0,
};

let suppressFocusEvent = false;

const cardEditor: ICardEditor = new CardEditorMarkdown();

let closing = false;

const close = () => {
  window.close();
};

let animationId: number | undefined;
let moveStartX: number;
let moveStartY: number;

const onBodyMouseUp = async () => {
  // document.body!.removeEventListener('mouseup', onBodyMouseUp);
  if (animationId !== undefined) {
    cancelAnimationFrame(animationId);
    animationId = undefined;

    if (moveStartX === window.screenX && moveStartY === window.screenY) return;

    let newGeom: Geometry;
    if (isLabelOpened(cardStore.getState().sketch.label.status)) {
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
    const displayRect = await window.api.getCurrentDisplayRect([
      { x: newGeom.x, y: newGeom.y },
      { x: newGeom.x + newGeom.width, y: newGeom.y },
      { x: newGeom.x, y: newGeom.y + newGeom.height },
      { x: newGeom.x + newGeom.width, y: newGeom.y + newGeom.height },
    ]);

    if (newGeom.x < displayRect[0].x - newGeom.width + WINDOW_POSITION_EDGE_MARGIN) {
      newGeom.x = displayRect[0].x - newGeom.width + WINDOW_POSITION_EDGE_MARGIN;
    }
    if (newGeom.x > displayRect[1].x + displayRect[1].width - WINDOW_POSITION_EDGE_MARGIN) {
      newGeom.x = displayRect[1].x + displayRect[1].width - WINDOW_POSITION_EDGE_MARGIN;
    }
    if (newGeom.y < displayRect[0].y) {
      newGeom.y = displayRect[0].y;
    }
    if (
      newGeom.y >
      displayRect[2].y + displayRect[2].height - WINDOW_POSITION_EDGE_MARGIN
    ) {
      newGeom.y = displayRect[2].y + displayRect[2].height - WINDOW_POSITION_EDGE_MARGIN;
    }
    window.api.setWindowRect(
      cardStore.getState().workState.url,
      newGeom.x,
      newGeom.y,
      newGeom.width,
      newGeom.height
    );

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
    console.log('## contents mousedown');
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

  document.getElementById('stickerBtn')?.addEventListener('click', async event => {
    const label = cardStore.getState().sketch.label;
    if (cardStore.getState().sketch.label.status === 'openedSticker') {
      label.status = 'openedLabel';
    }
    else {
      label.status = 'openedSticker';
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
      render(['ContentsData', 'ContentsRect']);
    }

    closing = true;
    suppressFocusEvent = true; // Suppress focus event in order not to focus and save this card just after closing card window.
    if (cardStore.getState().body._body === '' || event.ctrlKey) {
      window.api.deleteCard(cardStore.getState().workState.url);
    }
    else {
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

  window.addEventListener('mouseleave', event => {});

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
    if (!isLabelOpened(cardStore.getState().sketch.label.status)) {
      onBodyMouseUp();
      mouseOffsetX = event.clientX;
      mouseOffsetY = event.clientY;
      moveStartX = window.screenX;
      moveStartY = window.screenY;

      document.body!.addEventListener('mouseup', onBodyMouseUp);
      requestAnimationFrame(moveWindow);
      event.preventDefault();
    }
  });

  document.body!.addEventListener('mousedown', event => {
    if (isLabelOpened(cardStore.getState().sketch.label.status)) {
      onBodyMouseUp();
      mouseOffsetX = event.clientX;
      mouseOffsetY = event.clientY;
      moveStartX = window.screenX;
      moveStartY = window.screenY;

      document.body!.addEventListener('mouseup', onBodyMouseUp);
      requestAnimationFrame(moveWindow);
      event.preventDefault();
    }
  });

  document.getElementById('title')!.addEventListener('dblclick', event => {
    if (!isLabelOpened(cardStore.getState().sketch.label.status)) {
      onBodyMouseUp();
      onTransformToLabel();
      event.preventDefault();
      event.stopPropagation();
    }
  });

  document.body!.addEventListener('dblclick', event => {
    if (isLabelOpened(cardStore.getState().sketch.label.status)) {
      onBodyMouseUp();
      onTransformToCard();
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
    case 'delete-selection':
      cardEditor.deleteSelection();
      break;
    case 'get-selected-markdown': {
      const [markdown, startLeft, endRight, top, bottom] = cardEditor.getSelectedMarkdown();
      window.api.responseOfGetSelectedMarkdown(
        cardStore.getState().workState.url,
        markdown,
        startLeft,
        endRight,
        top,
        bottom
      );
      break;
    }
    case 'move-by-hand':
      onChangeRectByHand(event.data.geometry, false);
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
      onChangeRectByHand(event.data.geometry, true);
      break;
    case 'send-to-back':
      onSendToBack(event.data.zIndex, event.data.modifiedDate);
      break;
    /*
    case 'set-lock':
      onSetLock(event.data.locked);
      break;
    */
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
      onTransformToCard();
      break;
    default:
      break;
  }
});

// eslint-disable-next-line complexity
const onTransformToLabel = async () => {
  const label = cardStore.getState().sketch.label;
  if (isLabelOpened(label.status)) return;

  if (cardEditor.isOpened) {
    // await endEditor();
    endEditor(); // Need not to wait saving.
  }

  label.text = cardEditor.getLabelText();

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
  if (label.zoom === undefined) {
    label.zoom = cardStore.getState().sketch.style.zoom;
  }

  if (label.status === 'closedLabel') {
    label.status = 'openedLabel';
    label.x = cardStore.getState().sketch.geometry.x;
    label.y = cardStore.getState().sketch.geometry.y;
  }
  if (label.status === 'stashedLabel') {
    label.status = 'openedLabel';
  }
  if (label.status === 'closedSticker') {
    label.status = 'openedSticker';
  }
  await cardStore.dispatch(cardLabelUpdateCreator(label));

  setRectToLabel();
};

const setRectToLabel = async () => {
  const label = cardStore.getState().sketch.label;
  if (
    cardStore.getState().sketch.geometry.height < cardStore.getState().sketch.label.height!
  ) {
    // Label is larger than card. It is rare case.
    // Wait for the card to shrink.
    document.getElementById('label')!.style.display = 'block';
    document.getElementById('contents')!.classList.toggle('show');
    document.getElementById('contents')!.classList.toggle('hide');
    await render();
    window.api.setWindowRect(
      cardStore.getState().workState.url,
      label.x!,
      label.y!,
      label.width!,
      label.height!,
      true
    );
  }
  else {
    await window.api.setWindowRect(
      cardStore.getState().workState.url,
      label.x!,
      label.y!,
      label.width!,
      label.height!,
      true
    );
    document.getElementById('label')!.style.display = 'block';
    document.getElementById('contents')!.classList.toggle('show');
    document.getElementById('contents')!.classList.toggle('hide');
    await render();
  }
};

// eslint-disable-next-line complexity
const onTransformToCard = async () => {
  const label = cardStore.getState().sketch.label;
  if (!isLabelOpened(label.status)) return;

  let newGeom: Geometry;
  if (cardStore.getState().sketch.label.status === 'openedSticker') {
    newGeom = cardStore.getState().sketch.geometry;
    label.status = 'closedSticker';
  }
  else {
    newGeom = {
      ...cardStore.getState().sketch.geometry,
      x: Math.round(label.x!),
      y: Math.round(label.y!),
    };
    label.status = 'closedLabel';
  }

  const [displayRect] = await window.api.getCurrentDisplayRect([
    { x: newGeom.x, y: newGeom.y },
  ]);
  // console.log(displayRect);
  let stashed = false;
  if (
    cardStore.getState().sketch.label.status === 'closedLabel' ||
    (cardStore.getState().sketch.label.status === 'closedSticker' &&
      cardStore.getState().sketch.label.x === cardStore.getState().sketch.geometry.x &&
      cardStore.getState().sketch.label.y === cardStore.getState().sketch.geometry.y)
  ) {
    if (newGeom.x + newGeom.width > displayRect.x + displayRect.width) {
      newGeom.x = displayRect.x + displayRect.width - newGeom.width;
      if (label.status === 'closedLabel') stashed = true;
    }
    if (newGeom.x < displayRect.x) {
      newGeom.x = displayRect.x;
      if (label.status === 'closedLabel') stashed = true;
    }
    if (newGeom.y + newGeom.height > displayRect.y + displayRect.height) {
      newGeom.y = displayRect.y + displayRect.height - newGeom.height;
      if (label.status === 'closedLabel') stashed = true;
    }
    if (newGeom.y < displayRect.y) {
      newGeom.y = displayRect.y;
      if (label.status === 'closedLabel') stashed = true;
    }
  }
  await cardStore.dispatch(cardLabelUpdateCreator(label));
  await cardStore.dispatch(cardGeometryUpdateCreator(newGeom));

  // Update label again
  if (stashed) {
    label.status = 'stashedLabel';
    await cardStore.dispatch(cardLabelUpdateCreator(label));
  }

  await setRectToCard();

  if (!cardEditor.isOpened) {
    startEditor();
  }
};

const setRectToCard = async () => {
  const sketch = cardStore.getState().sketch;
  if (sketch.geometry.height < sketch.label.height!) {
    // Label is larger than card. It is rare case.
    // Wait for the card to shrink.
    await window.api.setWindowRect(
      cardStore.getState().workState.url,
      sketch.geometry.x,
      sketch.geometry.y,
      sketch.geometry.width,
      sketch.geometry.height,
      true
    );
    document.getElementById('label')!.style.display = 'none';
    document.getElementById('contents')!.classList.toggle('show');
    document.getElementById('contents')!.classList.toggle('hide');
    await render();
  }
  else {
    document.getElementById('label')!.style.display = 'none';
    document.getElementById('contents')!.classList.toggle('show');
    document.getElementById('contents')!.classList.toggle('hide');
    await render();
    window.api.setWindowRect(
      cardStore.getState().workState.url,
      sketch.geometry.x,
      sketch.geometry.y,
      sketch.geometry.width,
      sketch.geometry.height,
      true
    );
  }
};

const onChangeRectByHand = async (geometry: Geometry, redraw: boolean) => {
  await cardStore.dispatch(cardGeometryUpdateCreator(geometry));
  // console.log('# render: ' + JSON.stringify(cardStore.getState().sketch));
  if (redraw) {
    render(['TitleBar', 'ContentsRect', 'EditorRect']);
  }
};

const onCardClose = async () => {
  if (cardEditor.isOpened) {
    await endEditor();
  }
  close();
};

const onCardFocused = (zIndex: number | undefined, modifiedDate: string | undefined) => {
  if (closing) return;

  if (suppressFocusEvent) return;

  cardStore.dispatch(cardSketchBringToFrontCreator(zIndex, modifiedDate));

  render(['TitleBar', 'TitleBarStyle', 'CardStyle', 'ContentsRect']);

  if (!cardEditor.isOpened) {
    startEditor();
  }
};

const onCardBlurred = () => {
  if (closing) return;

  onBodyMouseUp();

  cardStore.dispatch(cardWorkStateStatusUpdateCreator('Blurred'));

  if (cardEditor.isOpened) {
    if (cardEditor.isCodeMode) {
      return;
    }
    endEditor();
  }
  render(['TitleBar', 'TitleBarStyle', 'ContentsData', 'CardStyle', 'ContentsRect']);
};

const onChangeCardColor = (backgroundColor: string, opacity = 1.0) => {
  // const uiColor = darkenHexColor(backgroundColor);
  // const uiColor = strengthenHexColor(backgroundColor);
  const uiColor = backgroundColor;
  saveCardColor(backgroundColor, uiColor, opacity);
  render(['CardStyle', 'TitleBarStyle', 'EditorStyle']);
};

/*
const onMoveByHand = (geometry: Geometry, modifiedDate: string) => {
  let currentX, currentY, currentZ, currentWidth, currentHeight: number;
  if (isLabelOpened(cardStore.getState().sketch.label.status)) {
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
  cardStore.dispatch(cardGeometryUpdateCreator(geometry, modifiedDate));
};
  */
// Render card data
// eslint-disable-next-line complexity
const onRenderCard = (
  url: string,
  cardBody: CardBody,
  cardSketch: CardSketch,
  config: RendererConfig
) => {
  console.log('# Browser zoom level: ' + window.api.getZoomLevel());
  if (window.api.getZoomLevel() !== 0) {
    /**
     * In rare cases, the application may not register the Ctrl +/- shortcut in time,
     * and the chromium Ctrl +/- shortcut may work,
     * causing the browser zoom level to be changed and recorded,
     * so reset it.
     */
    window.api.setZoomLevel(0);
    console.log('# Reset browser zoom level to 0');
  }
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
    type: 'card-collapsed-list-init',
    payload: cardSketch.collapsedList,
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
  document.getElementById('newBtn')!.style.display = 'block';
  document.getElementById('closeBtn')!.style.display = 'block';
  document.getElementById('stickerBtn')!.style.display = 'block';

  if (isLabelOpened(cardStore.getState().sketch.label.status)) {
    document.getElementById('contents')!.classList.toggle('show');
    document.getElementById('contents')!.classList.toggle('hide');
    document.getElementById('label')!.style.display = 'block';
  }
  else {
    document.getElementById('label')!.style.display = 'none';
  }
  // document.getElementById('card')!.style.visibility = 'visible';
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
/*
const onSetLock = (locked: boolean) => {
  cardStore.dispatch(cardConditionLockedUpdateCreator(locked));
  if (cardEditor.isOpened) {
    endEditor();
    render();
  }
};
*/
const onZoomIn = async () => {
  if (window.api.getZoomLevel() !== 0) {
    // Reset browser side zoom level
    window.api.setZoomLevel(0);
    console.log('# reset zoom level to 0');
    render();
  }

  let zoom: number;
  if (isLabelOpened(cardStore.getState().sketch.label.status)) {
    zoom = cardStore.getState().sketch.label.zoom!;
  }
  else {
    zoom = cardStore.getState().sketch.style.zoom;
  }

  if (zoom < 1.0) {
    zoom += 0.15;
  }
  else {
    zoom += 0.3;
  }
  if (zoom > 3) {
    zoom = 3;
  }

  if (isLabelOpened(cardStore.getState().sketch.label.status)) {
    const newLabel: CardLabel = { ...cardStore.getState().sketch.label };
    newLabel.zoom = zoom;
    await cardStore.dispatch(cardLabelUpdateCreator(newLabel));
  }
  else {
    const newStyle: CardStyle = { ...cardStore.getState().sketch.style };
    newStyle.zoom = zoom;
    await cardStore.dispatch(cardStyleUpdateCreator(newStyle));
  }
  render(['CardStyle', 'EditorStyle']);
};

const onZoomOut = async () => {
  if (window.api.getZoomLevel() !== 0) {
    // Reset browser side zoom level
    window.api.setZoomLevel(0);
    console.log('# reset zoom level to 0');
    render();
  }

  let zoom: number;
  if (isLabelOpened(cardStore.getState().sketch.label.status)) {
    zoom = cardStore.getState().sketch.label.zoom!;
  }
  else {
    zoom = cardStore.getState().sketch.style.zoom;
  }

  if (zoom <= 1.0) {
    zoom -= 0.15;
  }
  else {
    zoom -= 0.3;
  }
  if (zoom <= 0.55) {
    zoom = 0.55;
  }

  if (isLabelOpened(cardStore.getState().sketch.label.status)) {
    const newLabel: CardLabel = { ...cardStore.getState().sketch.label };
    newLabel.zoom = zoom;
    await cardStore.dispatch(cardLabelUpdateCreator(newLabel));
  }
  else {
    const newStyle: CardStyle = { ...cardStore.getState().sketch.style };
    newStyle.zoom = zoom;
    await cardStore.dispatch(cardStyleUpdateCreator(newStyle));
  }
  render(['CardStyle', 'EditorStyle']);
};

// eslint-disable-next-line complexity
const onSyncCardSketch = async (changedFile: ChangedFile, enqueueTime: string) => {
  if (changedFile.operation === 'insert') {
    // It is not invoked.
  }
  else if (changedFile.operation === 'update') {
    const oldCardSketch = changedFile.old.doc as CardSketch;
    const newCardSketch = changedFile.new.doc as CardSketch;

    const oldLabelOpened = isLabelOpened(oldCardSketch.label.status);
    const newLabelOpened = isLabelOpened(newCardSketch.label.status);
    await cardStore.dispatch(cardSketchUpdateCreator(newCardSketch, 'remote', enqueueTime));

    if (!oldLabelOpened && !newLabelOpened) {
      // move card
      const oldGeom = oldCardSketch.geometry;
      const newGeom = newCardSketch.geometry;
      if (
        newGeom.x !== oldGeom.x ||
        newGeom.y !== oldGeom.y ||
        newGeom.width !== oldGeom.width ||
        newGeom.height !== oldGeom.height
      ) {
        window.api.setWindowRect(
          cardStore.getState().workState.url,
          newGeom.x,
          newGeom.y,
          newGeom.width,
          newGeom.height
        );
      }
      render(['TitleBar', 'ContentsRect', 'CardStyle', 'EditorStyle', 'EditorRect']);
    }
    else if (oldLabelOpened && newLabelOpened) {
      // move label
      const oldX = oldCardSketch.label.x!;
      const newX = newCardSketch.label.x!;
      const oldY = oldCardSketch.label.y!;
      const newY = newCardSketch.label.y!;
      const oldWidth = oldCardSketch.label.width!;
      const newWidth = newCardSketch.label.width!;
      const oldHeight = oldCardSketch.label.height!;
      const newHeight = newCardSketch.label.height!;

      if (
        newX !== oldX ||
        newY !== oldY ||
        newWidth !== oldWidth ||
        newHeight !== oldHeight
      ) {
        window.api.setWindowRect(
          cardStore.getState().workState.url,
          newX,
          newY,
          newWidth,
          newHeight
        );
      }
      render(['TitleBar', 'ContentsRect', 'CardStyle', 'EditorStyle', 'EditorRect']);
    }
    else if (oldLabelOpened && !newLabelOpened) {
      setRectToCard();
      if (cardStore.getState().workState.status === 'Focused') {
        startEditor();
      }
    }
    else if (!oldLabelOpened && newLabelOpened) {
      if (cardEditor.isOpened) {
        // await endEditor();
        endEditor(); // Need not to wait saving.
      }
      setRectToLabel();
    }
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
  cardEditor.setData(
    cardStore.getState().body._body,
    cardStore.getState().sketch.collapsedList
  );
  render(['ContentsData', 'CardStyle']);
};

const startEditor = async (x?: number, y?: number) => {
  /*
  if (cardStore.getState().sketch.condition.locked) {
    return;
  }
  */
  if (isLabelOpened(cardStore.getState().sketch.label.status)) {
    return;
  }

  await cardEditor.showEditor();

  const contents = document.getElementById('contents');
  const scrollTop = contents!.scrollTop;
  const scrollLeft = contents!.scrollLeft;

  cardEditor.startEdit();

  cardEditor.setScrollPosition(scrollLeft, scrollTop);

  if (x !== undefined && y !== undefined) {
    /*    setInterval(() => {
      window.api.sendLeftMouseDown(cardStore.getState().workState.url, x, y);
    }, 0);
    */
    // Need not to use MouseDown but MouseClick
    window.api.sendLeftMouseClick(cardStore.getState().workState.url, x, y);
  }
};

const endEditor = async () => {
  await cardEditor.endEdit(); // body will be saved in endEdit()

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

    const windowHeight =
      newImageHeight +
      DRAG_IMAGE_MARGIN +
      document.getElementById('title')!.offsetHeight +
      cardCssStyle.borderWidth * 2 +
      shadowHeight;
    const geometryHeight = windowHeight;

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
        collapsedList: [],
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
      cardStore.getState().sketch.geometry.height,
      true
    );

    render(['TitleBar', 'CardStyle', 'ContentsData', 'ContentsRect']);

    window.api.focus(cardStore.getState().workState.url);
    await cardEditor.showEditor();
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
