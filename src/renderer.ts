/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { DebounceQueue } from 'rx-queue';
import {
  AvatarProp,
  AvatarPropSerializable,
  CardAvatars,
  DEFAULT_CARD_GEOMETRY,
  DRAG_IMAGE_MARGIN,
  TransformableFeature,
} from './modules_common/cardprop';
import {
  CardCssStyle,
  contentsFrameCommand,
  ContentsFrameMessage,
  FileDropEvent,
  ICardEditor,
  InnerClickEvent,
} from './modules_common/types_cardeditor';
import { DialogButton } from './modules_common/const';
import { CardEditor } from './modules_renderer/editor';
import {
  getRenderOffsetHeight,
  getRenderOffsetWidth,
  initCardRenderer,
  onResizeByHand,
  render,
  shadowHeight,
  shadowWidth,
} from './modules_renderer/card_renderer';
import { darkenHexColor } from './modules_common/color';
import {
  deleteAvatar,
  deleteCard,
  saveCard,
  saveCardColor,
  waitUnfinishedTasks,
} from './modules_renderer/save';
import window from './modules_renderer/window';
import { getLocationFromUrl } from './modules_common/avatar_url_utils';
import { getCurrentWorkspaceUrl } from './modules_main/store_workspaces';
import { setAltDown, setCtrlDown, setMetaDown, setShiftDown } from './modules_common/keys';
import { Card } from './modules_common/schema_card';
import { Avatar } from './modules_common/schema_avatar';
import { avatarSizeUpdateActionCreator } from './modules_common/actions';

let avatarProp: AvatarProp = new AvatarProp('');

let avatarUrlEncoded: string;

let cardCssStyle: CardCssStyle = {
  borderWidth: 0,
};

let canClose = false;

let suppressFocusEvent = false;

const cardEditor: ICardEditor = new CardEditor();

const close = async () => {
  await waitUnfinishedTasks(avatarProp.url).catch((e: Error) => {
    console.error(e.message);
  });
  canClose = true;
  window.close();
};

/**
 * queueSaveCommand
 * Queuing and execute only last save command to avoid frequent save.
 */
let execSaveCommandTimeout: NodeJS.Timeout;
const execSaveCommand = () => {
  saveCard(avatarProp);
};

export const queueSaveCommand = () => {
  clearTimeout(execSaveCommandTimeout);
  execSaveCommandTimeout = setTimeout(execSaveCommand, 1000);
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
    const geometry = DEFAULT_CARD_GEOMETRY;
    geometry.x = avatarProp.geometry.x + 30;
    geometry.y = avatarProp.geometry.y + 30;
    const avatars: CardAvatars = {};
    avatars[getLocationFromUrl(avatarProp.url)] = new TransformableFeature(
      {
        x: geometry.x,
        y: geometry.y,
        z: geometry.z + 1,
        width: geometry.width,
        height: geometry.height,
      },
      {
        uiColor: avatarProp.style.uiColor,
        backgroundColor: avatarProp.style.backgroundColor,
        opacity: avatarProp.style.opacity,
        zoom: avatarProp.style.zoom,
      }
    );
    const newId = await window.api.createCard({
      avatars: avatars,
    });
    window.api.focus(getCurrentWorkspaceUrl() + newId);
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
      avatarProp.data = data;
      render(['TitleBar', 'ContentsData', 'ContentsRect']);
    }

    if (avatarProp.data === '' || event.ctrlKey) {
      deleteCard(avatarProp);
    }
    else {
      /**
       * Don't use window.confirm(MESSAGE.confirm_closing)
       * It disturbs correct behavior of CKEditor.
       * Caret of CKEditor is disappeared just after push Cancel button of window.confirm()
       */
      window.api
        .confirmDialog(avatarProp.url, ['btnCloseCard', 'btnCancel'], 'confirmClosing')
        .then((res: number) => {
          if (res === DialogButton.Default) {
            // OK
            suppressFocusEvent = true; // Suppress focus event in order not to focus and save this card just after closing card window.
            deleteAvatar(avatarProp);
          }
          else if (res === DialogButton.Cancel) {
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
  const debouncedResizeQueue = new DebounceQueue(1000);
  debouncedResizeQueue.subscribe(rect => {
    const action = avatarSizeUpdateActionCreator(avatarProp.url, rect, true);
    window.api.persistentStoreActionDispatcherFromRenderer(action);
  });

  const onmousemove = (event: MouseEvent) => {
    let newWidth = avatarProp.geometry.width + getRenderOffsetWidth();
    let newHeight = avatarProp.geometry.height + getRenderOffsetHeight();
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
        x: avatarProp.geometry.x,
        y: avatarProp.geometry.y,
        width: newWidth,
        height: newHeight,
      };
      debouncedResizeQueue.next(rect);
      window.resizeTo(newWidth, newHeight);
      onResizeByHand(rect);
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

const waitIframeInitializing = () => {
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
  for (var i = 0; i < arr.length; i++) {
    const pair = arr[i].split('=');
    params[pair[0]] = pair[1];
  }
  avatarUrlEncoded = params.avatarUrl;
  if (!avatarUrlEncoded) {
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
  window.api.finishLoad(avatarUrlEncoded);
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
      // onMoveByHand(event.data.bounds);
      break;
    case 'render-card':
      onRenderCard(event.data.card, event.data.avatar);
      break;
    case 'resize-by-hand':
      // onResizeByHand(event.data.bounds);
      break;
    case 'send-to-back':
      onSendToBack();
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

const onCardClose = () => {
  close();
};

const onCardFocused = async () => {
  if (suppressFocusEvent) {
    return;
  }

  avatarProp.status = 'Focused';
  render(['CardStyle', 'ContentsRect']);

  await window.api.bringToFront(avatarProp.url);
  // const newZ = await window.api.bringToFront(avatarProp.url);
  // eslint-disable-next-line require-atomic-updates
  // avatarProp.geometry.z = newZ;
  /** 
  saveCard(avatarProp);
  */
};

const onCardBlurred = () => {
  avatarProp.status = 'Blurred';
  render(['CardStyle', 'ContentsRect']);

  /*
  if (cardEditor.isOpened) {
    if (cardEditor.isCodeMode) {
      return;
    }
    endEditor();
  }
  */
};

const onChangeCardColor = (backgroundColor: string, opacity = 1.0) => {
  const uiColor = darkenHexColor(backgroundColor);
  saveCardColor(avatarProp, backgroundColor, uiColor, opacity);
  render(['CardStyle', 'TitleBarStyle', 'EditorStyle']);
};

const onMoveByHand = (newBounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  avatarProp.geometry.x = Math.round(newBounds.x);
  avatarProp.geometry.y = Math.round(newBounds.y);

  // queueSaveCommand();
};

// Render card data
const onRenderCard = (card: Card, avatar: Avatar) => {
  const _prop: AvatarPropSerializable = {
    ...avatar,
    data: card.data,
  };
  avatarProp = AvatarProp.fromObject(_prop);

  initCardRenderer(avatarProp, cardCssStyle, cardEditor);

  cardEditor.setCard(avatarProp);

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

  window.api.finishRenderCard(avatarProp.url).catch((e: Error) => {
    // logger.error does not work in ipcRenderer event.
    console.error(`Error in render-card: ${e.message}`);
  });
};

const onSendToBack = async () => {
  const newZ = await window.api.sendToBack(avatarProp.url);
  // eslint-disable-next-line require-atomic-updates
  avatarProp.geometry.z = newZ;
  saveCard(avatarProp);
};

const onSetLock = (locked: boolean) => {
  avatarProp.condition.locked = locked;
  if (cardEditor.isOpened) {
    endEditor();
  }
};

const onZoomIn = () => {
  if (avatarProp.style.zoom < 1.0) {
    avatarProp.style.zoom += 0.15;
  }
  else {
    avatarProp.style.zoom += 0.3;
  }
  if (avatarProp.style.zoom > 3) {
    avatarProp.style.zoom = 3;
  }
  render(['CardStyle', 'EditorStyle']);

  saveCard(avatarProp);
};

const onZoomOut = () => {
  if (avatarProp.style.zoom <= 1.0) {
    avatarProp.style.zoom -= 0.15;
  }
  else {
    avatarProp.style.zoom -= 0.3;
  }
  if (avatarProp.style.zoom <= 0.55) {
    avatarProp.style.zoom = 0.55;
  }
  render(['CardStyle', 'EditorStyle']);

  saveCard(avatarProp);
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
  window.api.sendLeftMouseDown(avatarProp.url, x, y + offsetY);
};

const endEditor = () => {
  cardEditor.hideEditor();

  const data = cardEditor.endEdit();
  avatarProp.data = data;
  render();

  const { left, top } = cardEditor.getScrollPosition();
  const iframe = document.getElementById('contentsFrame') as HTMLIFrameElement;
  iframe.contentWindow!.scrollTo(left, top);
};

const startEditorByClick = (clickEvent: InnerClickEvent) => {
  if (avatarProp.condition.locked) {
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
    if (avatarProp.data === '') {
      imageOnly = true;
    }
    const width = dropImg.naturalWidth;
    const height = dropImg.naturalHeight;

    let newImageWidth =
      avatarProp.geometry.width -
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
      avatarProp.geometry.height = geometryHeight;
      avatarProp.data = imgTag;
    }
    else {
      avatarProp.geometry.height = avatarProp.geometry.height + newImageHeight;
      avatarProp.data = avatarProp.data + '<br />' + imgTag;
      windowHeight = avatarProp.geometry.height + getRenderOffsetHeight();
    }

    await window.api.setWindowSize(
      avatarProp.url,
      avatarProp.geometry.width,
      avatarProp.geometry.height
    );

    if (imageOnly) {
      saveCardColor(avatarProp, '#ffffff', '#ffffff', 0.0);
    }
    else {
      saveCard(avatarProp);
    }
    render(['TitleBar', 'CardStyle', 'ContentsData', 'ContentsRect']);

    window.api.focus(avatarProp.url);
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
    await waitUnfinishedTasks(avatarProp.url).catch((error: Error) => {
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
