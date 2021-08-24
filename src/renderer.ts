/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { CardProp, CardPropStatus } from './modules_common/types';
import {
  CardCssStyle,
  contentsFrameCommand,
  ContentsFrameMessage,
  FileDropEvent,
  ICardEditor,
  InnerClickEvent,
} from './modules_common/types_cardeditor';
import {
  DEFAULT_CARD_GEOMETRY,
  DIALOG_BUTTON,
  DRAG_IMAGE_MARGIN,
} from './modules_common/const';
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
import {
  deleteCard,
  deleteCard,
  saveCard,
  saveCardColor,
  waitUnfinishedTasks,
} from './modules_renderer/save';
import window from './modules_renderer/window';
import { setAltDown, setCtrlDown, setMetaDown, setShiftDown } from './modules_common/keys';

let cardPropStatus: CardPropStatus;

let cardUrlEncoded: string;

let cardCssStyle: CardCssStyle = {
  borderWidth: 0,
};

let canClose = false;

let suppressFocusEvent = false;

const cardEditor: ICardEditor = new CardEditor();

const close = async () => {
  await waitUnfinishedTasks(cardPropStatus.url).catch((e: Error) => {
    console.error(e.message);
  });
  canClose = true;
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
    geometry.x = cardPropStatus.geometry.x + 30;
    geometry.y = cardPropStatus.geometry.y + 30;
    const cardProp: Partial<CardProp> = {
      geometry: {
        x: geometry.x,
        y: geometry.y,
        z: geometry.z, // z will be overwritten in createCard()
        width: geometry.width,
        height: geometry.height,
      },
      style: {
        uiColor: cardPropStatus.style.uiColor,
        backgroundColor: cardPropStatus.style.backgroundColor,
        opacity: cardPropStatus.style.opacity,
        zoom: cardPropStatus.style.zoom,
      },
    };
    await window.api.createCard(cardProp);
  });

  // eslint-disable-next-line no-unused-expressions
  document.getElementById('codeBtn')?.addEventListener('click', () => {
    cardEditor.toggleCodeMode();
  });

  // eslint-disable-next-line no-unused-expressions
  document.getElementById('closeBtn')?.addEventListener('click', event => {
    if (cardEditor.isOpened) {
      cardEditor.hideEditor();
      const data = cardEditor.endEdit();
      cardPropStatus._body = data;
      render(['TitleBar', 'ContentsData', 'ContentsRect']);
    }

    if (cardPropStatus._body === '' || event.ctrlKey) {
      deleteCard(cardPropStatus);
    }
    else {
      /**
       * Don't use window.confirm(MESSAGE.confirm_closing)
       * It disturbs correct behavior of CKEditor.
       * Caret of CKEditor is disappeared just after push Cancel button of window.confirm()
       */
      window.api
        .confirmDialog(cardPropStatus.url, ['btnCloseCard', 'btnCancel'], 'confirmClosing')
        .then((res: number) => {
          if (res === DIALOG_BUTTON.default) {
            // OK
            suppressFocusEvent = true; // Suppress focus event in order not to focus and save this card just after closing card window.
            deleteCard(cardPropStatus);
          }
          else if (res === DIALOG_BUTTON.cancel) {
            // Cancel
          }
        })
        .catch((e: Error) => {
          console.error(e.message);
        });
    }
  });

  let prevMouseX: number;
  let prevMouseY: number;
  let isHorizontalMoving = false;
  let isVerticalMoving = false;

  const onmousemove = (event: MouseEvent) => {
    if (cardPropStatus === undefined) {
      return;
    }
    let newWidth = cardPropStatus.geometry.width + getRenderOffsetWidth();
    let newHeight = cardPropStatus.geometry.height + getRenderOffsetHeight();
    if (isHorizontalMoving) {
      newWidth += event.screenX - prevMouseX;
    }
    if (isVerticalMoving) {
      newHeight += event.screenY - prevMouseY;
    }
    prevMouseX = event.screenX;
    prevMouseY = event.screenY;

    if (isHorizontalMoving || isVerticalMoving) {
      const rect = {
        x: cardPropStatus.geometry.x,
        y: cardPropStatus.geometry.y,
        width: newWidth,
        height: newHeight,
      };
      window.resizeTo(newWidth, newHeight);
      onResizeByHand(rect, true);
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
  cardUrlEncoded = params.cardUrl;
  if (!cardUrlEncoded) {
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
  window.api.finishLoad(cardUrlEncoded);
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
      onMoveByHand(event.data.bounds);
      break;
    case 'render-card':
      onRenderCard(event.data.cardProp);
      break;
    case 'resize-by-hand':
      onResizeByHand(event.data.bounds, false);
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
    default:
      break;
  }
});

/**
 * queueSaveCommand
 * Queuing and execute only last save command to avoid frequent save.
 */
let execSaveCommandTimeout: NodeJS.Timeout;
const execSaveCommand = () => {
  saveCard(cardPropStatus, 'PropertyOnly');
};

export const queueSaveCommand = () => {
  clearTimeout(execSaveCommandTimeout);
  execSaveCommandTimeout = setTimeout(execSaveCommand, 1000);
};

const onResizeByHand = (
  newBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  sendToMain: boolean
) => {
  if (
    cardPropStatus.geometry.x !== newBounds.x ||
    cardPropStatus.geometry.y !== newBounds.y ||
    cardPropStatus.geometry.width !== newBounds.width ||
    cardPropStatus.geometry.height !== newBounds.height
  ) {
    cardPropStatus.geometry.x = Math.round(newBounds.x);
    cardPropStatus.geometry.y = Math.round(newBounds.y);
    cardPropStatus.geometry.width = Math.round(newBounds.width - getRenderOffsetWidth());
    cardPropStatus.geometry.height = Math.round(newBounds.height - getRenderOffsetHeight());

    render(['TitleBar', 'ContentsRect', 'EditorRect']);
  }
  if (sendToMain) {
    queueSaveCommand();
  }
};

const onCardClose = () => {
  close();
};

const onCardFocused = async () => {
  if (suppressFocusEvent) {
    return;
  }

  cardPropStatus.status = 'Focused';
  render(['CardStyle', 'ContentsRect']);

  const newZ = await window.api.bringToFront(cardPropStatus);
  // eslint-disable-next-line require-atomic-updates
  cardPropStatus.geometry.z = newZ;
};

const onCardBlurred = () => {
  cardPropStatus.status = 'Blurred';
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
  saveCardColor(cardPropStatus, backgroundColor, uiColor, opacity);
  render(['CardStyle', 'TitleBarStyle', 'EditorStyle']);
};

const onMoveByHand = (newBounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  cardPropStatus.geometry.x = Math.round(newBounds.x);
  cardPropStatus.geometry.y = Math.round(newBounds.y);
};

// Render card data
const onRenderCard = (cardProp: CardProp) => {
  cardPropStatus = { ...cardProp, status: 'Blurred' };

  initCardRenderer(cardPropStatus, cardCssStyle, cardEditor);

  cardEditor.setCard(cardPropStatus);

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

  window.api.finishRenderCard(cardPropStatus.url).catch((e: Error) => {
    // logger.error does not work in ipcRenderer event.
    console.error(`Error in render-card: ${e.message}`);
  });
};

const onSendToBack = (zIndex: number) => {
  // eslint-disable-next-line require-atomic-updates
  cardPropStatus.geometry.z = zIndex;
};

const onSetLock = (locked: boolean) => {
  cardPropStatus.condition.locked = locked;
  if (cardEditor.isOpened) {
    endEditor();
  }
  saveCard(cardPropStatus, 'PropertyOnly');
};

const onZoomIn = () => {
  if (cardPropStatus.style.zoom < 1.0) {
    cardPropStatus.style.zoom += 0.15;
  }
  else {
    cardPropStatus.style.zoom += 0.3;
  }
  if (cardPropStatus.style.zoom > 3) {
    cardPropStatus.style.zoom = 3;
  }
  render(['CardStyle', 'EditorStyle']);

  saveCard(cardPropStatus, 'PropertyOnly');
};

const onZoomOut = () => {
  if (cardPropStatus.style.zoom <= 1.0) {
    cardPropStatus.style.zoom -= 0.15;
  }
  else {
    cardPropStatus.style.zoom -= 0.3;
  }
  if (cardPropStatus.style.zoom <= 0.55) {
    cardPropStatus.style.zoom = 0.55;
  }
  render(['CardStyle', 'EditorStyle']);

  saveCard(cardPropStatus, 'PropertyOnly');
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
  window.api.sendLeftMouseDown(cardPropStatus.url, x, y + offsetY);
};

const endEditor = () => {
  cardEditor.hideEditor();

  const data = cardEditor.endEdit();
  cardPropStatus._body = data;
  render();

  const { left, top } = cardEditor.getScrollPosition();
  const iframe = document.getElementById('contentsFrame') as HTMLIFrameElement;
  iframe.contentWindow!.scrollTo(left, top);
};

const startEditorByClick = (clickEvent: InnerClickEvent) => {
  if (cardPropStatus.condition.locked) {
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
    if (cardPropStatus._body === '') {
      imageOnly = true;
    }
    const width = dropImg.naturalWidth;
    const height = dropImg.naturalHeight;

    let newImageWidth =
      cardPropStatus.geometry.width -
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
    let windowHeight =
      newImageHeight +
      DRAG_IMAGE_MARGIN +
      document.getElementById('title')!.offsetHeight +
      cardCssStyle.borderWidth * 2 +
      shadowHeight;
    const geometryHeight = windowHeight - getRenderOffsetHeight();

    if (imageOnly) {
      cardPropStatus.geometry.height = geometryHeight;
      cardPropStatus._body = imgTag;
    }
    else {
      cardPropStatus.geometry.height = cardPropStatus.geometry.height + newImageHeight;
      cardPropStatus._body = cardPropStatus._body + '<br />' + imgTag;
      windowHeight = cardPropStatus.geometry.height + getRenderOffsetHeight();
    }

    await window.api.setWindowSize(
      cardPropStatus.url,
      cardPropStatus.geometry.width,
      cardPropStatus.geometry.height
    );

    if (imageOnly) {
      saveCardColor(cardPropStatus, '#ffffff', '#ffffff', 0.0);
    }
    else {
      saveCard(cardPropStatus, 'PropertyOnly');
    }
    render(['TitleBar', 'CardStyle', 'ContentsData', 'ContentsRect']);

    window.api.focus(cardPropStatus.url);
    await cardEditor.showEditor().catch((err: Error) => {
      console.error(`Error in loading image: ${err.message}`);
    });
    cardEditor.startEdit();
  });

  dropImg.src = fileDropEvent.path;
};

window.addEventListener('load', onload, false);
window.addEventListener('beforeunload', async e => {
  if (!canClose) {
    await waitUnfinishedTasks(cardPropStatus.url).catch((error: Error) => {
      console.error(error.message);
    });
    //    e.preventDefault();
    //    e.returnValue = '';
    console.debug('Closing by operating system');
  }
});

// Remove APIs
const disableAPIList = ['open', 'alert', 'confirm', 'prompt', 'print'];
disableAPIList.forEach(prop => {
  // @ts-ignore
  window[prop] = () => {
    console.error(prop + ' is disabled.');
  };
});
