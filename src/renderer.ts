/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { ChangedFile } from 'git-documentdb';
import { cardStore } from './modules_renderer/card_store';
import { CardBody, CardSketch, CardStyle, Geometry } from './modules_common/types';
import {
  CardCssStyle,
  contentsFrameCommand,
  ContentsFrameMessage,
  FileDropEvent,
  ICardEditor,
  InnerClickEvent,
} from './modules_common/types_cardeditor';
import { DEFAULT_CARD_GEOMETRY, DRAG_IMAGE_MARGIN } from './modules_common/const';
import { CardEditor } from './modules_renderer/editor';
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
import { setAltDown, setCtrlDown, setMetaDown, setShiftDown } from './modules_common/keys';
import {
  cardBodyUpdateCreator,
  cardGeometryUpdateCreator,
  cardSketchBringToFrontCreator,
  cardSketchSendToBackCreator,
  cardSketchUpdateCreator,
  cardStyleUpdateCreator,
} from './modules_renderer/card_action_creator';
import { ChangeFrom } from './modules_renderer/card_types';

let sketchUrlEncoded: string;

let cardCssStyle: CardCssStyle = {
  borderWidth: 0,
};

let suppressFocusEvent = false;

const cardEditor: ICardEditor = new CardEditor();

const close = () => {
  window.close();
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

  // eslint-disable-next-line no-unused-expressions
  document.getElementById('newBtn')?.addEventListener('click', async () => {
    // Position of a new card is relative to this card.

    const geometry = { ...DEFAULT_CARD_GEOMETRY };
    geometry.x = cardStore.getState().sketch.geometry.x + 30;
    geometry.y = cardStore.getState().sketch.geometry.y + 30;
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

  // eslint-disable-next-line no-unused-expressions
  document.getElementById('codeBtn')?.addEventListener('click', () => {
    cardEditor.toggleCodeMode();
  });

  // eslint-disable-next-line no-unused-expressions
  document.getElementById('closeBtn')?.addEventListener('click', event => {
    if (cardEditor.isOpened) {
      cardEditor.hideEditor();
      const _body = cardEditor.endEdit();
      // @ts-ignore
      cardStore.dispatch(cardBodyUpdateCreator(_body));

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
          if (res === DIALOG_BUTTON.default) {
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

  let prevMouseX: number;
  let prevMouseY: number;
  let isHorizontalMoving = false;
  let isVerticalMoving = false;

  const onmousemove = (event: MouseEvent) => {
    let newWidth = cardStore.getState().sketch.geometry.width + getRenderOffsetWidth();
    let newHeight = cardStore.getState().sketch.geometry.height + getRenderOffsetHeight();
    if (isHorizontalMoving) {
      newWidth += event.screenX - prevMouseX;
    }
    if (isVerticalMoving) {
      newHeight += event.screenY - prevMouseY;
    }
    prevMouseX = event.screenX;
    prevMouseY = event.screenY;

    if (isHorizontalMoving || isVerticalMoving) {
      const newGeom = {
        ...cardStore.getState().sketch.geometry,
        width: newWidth,
        height: newHeight,
      };
      window.resizeTo(newWidth, newHeight);
      onResizeByHand(newGeom, 'local');
    }
  };
  window.addEventListener('mousemove', onmousemove);

  window.addEventListener('mouseup', event => {
    isHorizontalMoving = false;
    isVerticalMoving = false;
    document.getElementById('windowMask')!.style.display = 'none';
  });
  window.addEventListener('mouseleave', event => {});

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
};

const waitIframeInitializing = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const iframe = document.getElementById('contentsFrame') as HTMLIFrameElement;

    const initializingReceived = (event: MessageEvent) => {
      const msg: ContentsFrameMessage = filterContentsFrameMessage(event);
      if (msg.command === 'contents-frame-initialized') {
        clearInterval(iframeLoadTimer);
        window.removeEventListener('message', initializingReceived);
        resolve();
      }
    };
    window.addEventListener('message', initializingReceived);
    let counter = 0;
    const iframeLoadTimer = setInterval(() => {
      const msg: ContentsFrameMessage = { command: 'check-initializing', arg: '' };
      iframe.contentWindow!.postMessage(msg, '*');
      if (++counter > 100) {
        clearInterval(iframeLoadTimer);
        reject(new Error('Cannot load iframe in waitIframeInitializing()'));
      }
    }, 100);
  });
};

const initializeContentsFrameEvents = () => {
  const iframe = document.getElementById('contentsFrame') as HTMLIFrameElement;

  window.addEventListener('message', (event: MessageEvent) => {
    const msg: ContentsFrameMessage = filterContentsFrameMessage(event);
    switch (msg.command) {
      case 'click-parent':
        // Click request from child frame
        if (msg.arg !== undefined) {
          startEditorByClick(JSON.parse(msg.arg) as InnerClickEvent);
        }
        break;

      case 'contents-frame-file-dropped':
        if (msg.arg !== undefined) {
          addDroppedImage(JSON.parse(msg.arg) as FileDropEvent);
        }
        break;

      default:
        break;
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

  await Promise.all([cardEditor.loadUI(cardCssStyle), waitIframeInitializing()]).catch(
    e => {
      console.error(e.message);
    }
  );

  initializeContentsFrameEvents();
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
      onCardFocused();
      break;
    case 'change-card-color':
      onChangeCardColor(event.data.backgroundColor, event.data.opacity);
      break;
    case 'move-by-hand':
      onMoveByHand(event.data.geometry, 'remote');
      break;
    case 'render-card':
      onRenderCard(event.data.sketchUrl, event.data.cardBody, event.data.cardSketch);
      break;
    case 'resize-by-hand':
      onResizeByHand(event.data.geometry, 'remote');
      break;
    case 'send-to-back':
      onSendToBack(event.data.zIndex);
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
    case 'sync-card':
      onSyncCard(event.data.changedFile, event.data.enqueueTime);
      break;
    case 'sync-card-body':
      onSyncCardBody(event.data.changedFile, event.data.enqueueTime);
      break;
    default:
      break;
  }
});

const onResizeByHand = (geometry: Geometry, changeFrom: ChangeFrom) => {
  const current = cardStore.getState().sketch.geometry;
  if (
    current.x !== geometry.x ||
    current.y !== geometry.y ||
    current.width !== geometry.width ||
    current.height !== geometry.height
  ) {
    const newGeom: Geometry = {
      x: Math.round(geometry.x),
      y: Math.round(geometry.y),
      z: current.z,
      width: Math.round(geometry.width - getRenderOffsetWidth()),
      height: Math.round(geometry.height - getRenderOffsetHeight()),
    };

    // @ts-ignore
    cardStore.dispatch(cardGeometryUpdateCreator(newGeom, changeFrom));

    render(['TitleBar', 'ContentsRect', 'EditorRect']);
  }
};

const onCardClose = () => {
  close();
};

const onCardFocused = () => {
  if (suppressFocusEvent) {
    return;
  }
  // @ts-ignore
  cardStore.dispatch(cardSketchBringToFrontCreator(sketchUrl));

  render(['CardStyle', 'ContentsRect']);
};

const onCardBlurred = () => {
  // @ts-ignore
  cardStore.dispatch(cardWorkStateStatusUpdateCreator('Blurred'));

  render(['CardStyle', 'ContentsRect']);

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

const onMoveByHand = (geometry: Geometry, changeFrom: ChangeFrom) => {
  const current = cardStore.getState().sketch.geometry;
  if (current.x !== geometry.x || current.y !== geometry.y) {
    const newGeom: Geometry = {
      x: Math.round(geometry.x),
      y: Math.round(geometry.y),
      z: current.z,
      width: current.width,
      height: current.height,
    };

    // @ts-ignore
    cardStore.dispatch(cardGeometryUpdateCreator(newGeom, changeFrom));
  }
};

// Render card data
const onRenderCard = (url: string, cardBody: CardBody, cardSketch: CardSketch) => {
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
    type: 'card-sketch-date-init',
    payload: cardBody.date,
  });
  cardStore.dispatch({
    type: 'card-sketch-id-init',
    payload: cardBody._id,
  });
  cardStore.dispatch({
    type: 'card-work-state-init',
    payload: {
      url,
      status: 'Blurred',
    },
  });

  initCardRenderer(cardCssStyle, cardEditor);

  // cardEditor.setCard(cardPropStatus);

  document.getElementById('card')!.style.visibility = 'visible';

  render()
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

  window.api.finishRenderCard(cardStore.getState().workState.url).catch((e: Error) => {
    // logger.error does not work in ipcRenderer event.
    console.error(`Error in render-card: ${e.message}`);
  });
};

const onSendToBack = (zIndex: number) => {
  // @ts-ignore
  cardStore.dispatch(cardSketchSendToBackCreator(zIndex));
};

const onSetLock = (locked: boolean) => {
  // @ts-ignore
  cardStore.dispatch(cardSketchLockedUpdateCreator(locked));
  if (cardEditor.isOpened) {
    endEditor();
  }
};

const onZoomIn = () => {
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
  // @ts-ignore
  cardStore.dispatch(cardStyleUpdateCreator(newStyle));
  render(['CardStyle', 'EditorStyle']);
};

const onZoomOut = () => {
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
  // @ts-ignore
  cardStore.dispatch(cardStyleUpdateCreator(newStyle));
  render(['CardStyle', 'EditorStyle']);
};

const onSyncCard = (changedFile: ChangedFile, enqueueTime: string) => {
  if (changedFile.operation === 'insert') {
    // TODO: Create new Card if noteId is currentNoteId.
    // TODO: Create new note (with default props) if not exits
  }
  else if (changedFile.operation === 'update') {
    // TaskQueue の日時をチェックして、すでに新しい cardProp 修正コマンドが出ていたらそこでキャンセル
    // TODO: Update new Card if noteId is currentNoteId.
    // すでに削除されたノートに対する更新は、新規ノート作成
  }
  else if (changedFile.operation === 'delete') {
    // TaskQueue の日時をチェックして、すでに新しい cardProp 修正コマンドが出ていたらそこでキャンセル
    // TODO: Delete card if noteId is currentNoteId
    // コンフリクトに注意。なお ours 戦略なので、こちらでカードの更新日付修正があれば削除はされない。
  }
};

const onSyncCardBody = (changedFile: ChangedFile, enqueueTime: string) => {
  if (changedFile.operation === 'insert') {
    //
  }
  else if (changedFile.operation === 'update') {
    //
  }
  else if (changedFile.operation === 'delete') {
    //
  }
};

const filterContentsFrameMessage = (event: MessageEvent): ContentsFrameMessage => {
  const msg: ContentsFrameMessage = event.data;
  if (!contentsFrameCommand.includes(msg.command)) {
    return { command: '', arg: '' };
  }
  return msg;
};

const startEditor = async (x: number, y: number) => {
  await cardEditor.showEditor().catch((e: Error) => {
    console.error(`Error in startEditor: ${e.message}`);
  });

  // Set scroll position of editor to that of iframe
  const iframe = document.getElementById('contentsFrame') as HTMLIFrameElement;
  const scrollTop = iframe.contentWindow!.scrollY;
  const scrollLeft = iframe.contentWindow!.scrollX;
  cardEditor.setScrollPosition(scrollLeft, scrollTop);

  const offsetY = document.getElementById('title')!.offsetHeight;
  cardEditor.execAfterMouseDown(cardEditor.startEdit);
  window.api.sendLeftMouseDown(cardStore.getState().workState.url, x, y + offsetY);
};

const endEditor = () => {
  cardEditor.hideEditor();

  cardEditor.endEdit(); // body will be saved in endEdit()

  render();

  const { left, top } = cardEditor.getScrollPosition();
  const iframe = document.getElementById('contentsFrame') as HTMLIFrameElement;
  iframe.contentWindow!.scrollTo(left, top);
};

const startEditorByClick = (clickEvent: InnerClickEvent) => {
  if (cardStore.getState().sketch.condition.locked) {
    return;
  }
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
        date: { ...cardStore.getState().sketch.date },
        _id: cardStore.getState().sketch._id,
      };

      // @ts-ignore
      cardStore.dispatch(cardSketchUpdateCreator(newSketch));
      // @ts-ignore
      cardStore.dispatch(cardBodyUpdateCreator(imgTag));
    }
    else {
      const newGeom = {
        ...cardStore.getState().sketch.geometry,
      };
      newGeom.height += newImageHeight;
      // @ts-ignore
      cardStore.dispatch(cardGeometryUpdateCreator(newGeom));
      cardStore.dispatch(
        // @ts-ignore
        cardBodyUpdateCreator(cardStore.getState().body._body + '<br />' + imgTag)
      );
    }

    await window.api.setWindowSize(
      cardStore.getState().workState.url,
      cardStore.getState().sketch.geometry.width,
      cardStore.getState().sketch.geometry.height
    );

    render(['TitleBar', 'CardStyle', 'ContentsData', 'ContentsRect']);

    window.api.focus(cardStore.getState().workState.url);
    await cardEditor.showEditor().catch((err: Error) => {
      console.error(`Error in loading image: ${err.message}`);
    });
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
