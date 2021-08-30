/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import url from 'url';
import path from 'path';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { DebounceQueue } from 'rx-queue';
import { generateNewCardId, getCurrentDateAndTime } from '../modules_common/utils';
import {
  APP_ICON_NAME,
  APP_SCHEME,
  CARD_VERSION,
  DEFAULT_CARD_CONDITION,
  DEFAULT_CARD_GEOMETRY,
  DEFAULT_CARD_STYLE,
  MINIMUM_WINDOW_HEIGHT,
  MINIMUM_WINDOW_WIDTH,
} from '../modules_common/const';
import { handlers } from './event';
import { CardBody, CardSketch, CardStatus, Geometry, ICard } from '../modules_common/types';
import { cacheOfCard } from './card_cache';
import { setContextMenu } from './card_context_menu';
import { INote } from './note_types';
import {
  getZIndexOfTopCard,
  setZIndexOfBottomCard,
  setZIndexOfTopCard,
} from './card_zindex';

/**
 * Focus control
 */
let globalFocusListenerPermission = true;

// Set permission to call focus event listener in all renderer processes.
export const setGlobalFocusEventListenerPermission = (
  canExecuteFocusEventListener: boolean
) => {
  globalFocusListenerPermission = canExecuteFocusEventListener;
};

export const getGlobalFocusEventListenerPermission = () => {
  return globalFocusListenerPermission;
};

/**
 * Create card
 */
export const createCardWindow = async (
  note: INote,
  sketchUrl: string,
  partialCardBody: Partial<CardBody>,
  partialCardSketch: Partial<CardSketch>
): Promise<void> => {
  // Overwrite z
  if (partialCardSketch.geometry !== undefined) {
    partialCardSketch.geometry.z = getZIndexOfTopCard() + 1;
  }
  const card = new Card(note, sketchUrl, partialCardBody, partialCardSketch);

  cacheOfCard.set(card.url, card);

  // Async
  note.createCard(sketchUrl, card.body, card.sketch);

  await card.render();
  console.debug(`focus in createCardWindow: ${card.url}`);
  card.window.focus();
};

/**
 * Card class
 */
export class Card implements ICard {
  private _note: INote;
  /**
   * CardProp
   */
  public url: string;

  public body: CardBody = {
    version: CARD_VERSION,
    type: 'text/html',
    user: 'local',
    date: {
      modifiedDate: '',
      createdDate: '',
    },
    _body: '',
    _id: '',
  };

  public sketch: CardSketch = {
    geometry: DEFAULT_CARD_GEOMETRY,
    style: DEFAULT_CARD_STYLE,
    condition: DEFAULT_CARD_CONDITION,
    date: {
      modifiedDate: '',
      createdDate: '',
    },
    _id: '',
  };

  /**
   * Temporal status
   */
  public status: CardStatus = 'Blurred';

  /**
   * Renderer
   */
  public window: BrowserWindow;
  public indexUrl: string;
  public renderingCompleted = false;

  /**
   * Focus control
   */
  public suppressFocusEventOnce = false;
  public suppressBlurEventOnce = false;
  public recaptureGlobalFocusEventAfterLocalFocusEvent = false;

  /**
   * Context menu
   */
  public resetContextMenu: () => void;

  /**
   * Constructor
   */
  // eslint-disable-next-line complexity
  constructor (
    note: INote,
    noteIdOrUrl: string,
    cardBody?: Partial<CardBody>,
    cardSketch?: Partial<CardSketch>
  ) {
    this._note = note;
    if (!noteIdOrUrl.startsWith(APP_SCHEME)) {
      // Create card with default properties
      const noteId = noteIdOrUrl;
      const cardId = generateNewCardId();
      this.url = `${APP_SCHEME}://local/${noteId}/${cardId}`;
    }
    else {
      this.url = noteIdOrUrl;
      // Create card with specified CardProp
      this.body = { ...this.body, ...cardBody };
      this.sketch.geometry = { ...this.sketch.geometry, ...cardSketch?.geometry };

      this.sketch.geometry.x = Math.round(this.sketch.geometry.x);
      this.sketch.geometry.y = Math.round(this.sketch.geometry.y);
      this.sketch.geometry.z = Math.round(this.sketch.geometry.z);
      this.sketch.geometry.width = Math.round(this.sketch.geometry.width);
      this.sketch.geometry.height = Math.round(this.sketch.geometry.height);

      this.sketch.style = { ...this.sketch.style, ...cardSketch?.style };

      this.sketch.condition = { ...this.sketch.condition, ...cardSketch?.condition };
    }

    const time = getCurrentDateAndTime();
    this.body.date.createdDate = cardBody?.date?.createdDate ?? time;
    this.body.date.modifiedDate = cardBody?.date?.modifiedDate ?? time;
    this.sketch.date.createdDate = cardSketch?.date?.createdDate ?? time;
    this.sketch.date.modifiedDate = cardSketch?.date?.modifiedDate ?? time;

    this.indexUrl = url.format({
      pathname: path.join(__dirname, '../index.html'),
      protocol: 'file:',
      slashes: true,
      query: {
        sketchUrl: this.url,
      },
    });

    this.window = new BrowserWindow({
      webPreferences: {
        preload: path.join(__dirname, './preload.js'),
        sandbox: true,
        contextIsolation: true,
      },
      minWidth: MINIMUM_WINDOW_WIDTH,
      minHeight: MINIMUM_WINDOW_HEIGHT,

      transparent: true,
      frame: false,
      show: false,

      maximizable: false,
      fullscreenable: false,

      icon: path.join(__dirname, `../assets/${APP_ICON_NAME}`),
    });
    this.window.setMaxListeners(20);

    if (!app.isPackaged && process.env.NODE_ENV === 'development') {
      this.window.webContents.openDevTools();
    }

    // Resized by hand
    // will-resize is only emitted when the window is being resized manually.
    // Resizing the window with setBounds/setSize will not emit this event.
    this.window.on('will-resize', this._willResizeListener);

    // Moved by hand
    this.window.on('will-move', this._willMoveListener);

    this.window.on('closed', this._closedListener);

    this.window.on('focus', this._focusListener);
    this.window.on('blur', this._blurListener);

    this.resetContextMenu = setContextMenu(note, this);

    // Open hyperlink on external browser window
    // by preventing to open it on new electron window
    // when target='_blank' is set.
    this.window.webContents.on('new-window', (e, _url) => {
      e.preventDefault();
      shell.openExternal(_url);
    });

    this.window.webContents.on('did-finish-load', () => {
      //      console.debug('did-finish-load: ' + this.window.webContents.getURL());
    });

    this.window.webContents.on('will-navigate', (event, navUrl) => {
      // block page transition
      /*      const prevUrl = this.indexUrl.replace(/\\/g, '/');
      if (navUrl === prevUrl) {
        // console.debug('reload() in top frame is permitted');
      }
      else {
*/
      console.error('Page navigation in top frame is not permitted.');
      event.preventDefault();
      //      }
    });

    this._debouncedCardPositionUpdateActionQueue.subscribe((geometry: Geometry) => {
      note.updateCardGeometry(this.url, geometry);
    });
  }

  private _debouncedCardPositionUpdateActionQueue = new DebounceQueue(1000);

  private _willMoveListener = (event: Electron.Event, rect: Electron.Rectangle) => {
    // Update x and y
    const geometry = { ...this.sketch.geometry, x: rect.x, y: rect.y };

    this._debouncedCardPositionUpdateActionQueue.next(geometry);
    this.window.webContents.send('move-by-hand', geometry);
  };

  private _willResizeListener = (event: Electron.Event, rect: Electron.Rectangle) => {
    // Update x, y, width, height
    const geometry = {
      ...this.sketch.geometry,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
    this.window.webContents.send('resize-by-hand', geometry);
  };

  private _closedListener = () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    this.removeWindowListeners();

    cacheOfCard.delete(this.url);

    // Emit window-all-closed event explicitly
    // because Electron sometimes does not emit it automatically.
    if (cacheOfCard.size === 0) {
      app.emit('window-all-closed');
    }
  };

  /**
   * _focusListener in Main Process
   * After startup, the first window.onfocus event is not invoked in Renderer Process.
   * Listen focus event in Main Process.
   */
  private _focusListener = () => {
    if (this.recaptureGlobalFocusEventAfterLocalFocusEvent) {
      this.recaptureGlobalFocusEventAfterLocalFocusEvent = false;
      setGlobalFocusEventListenerPermission(true);
    }
    if (this.suppressFocusEventOnce) {
      console.debug(`skip focus event listener ${this.url}`);
      this.suppressFocusEventOnce = false;
    }
    else if (!getGlobalFocusEventListenerPermission()) {
      console.debug(`focus event listener is suppressed ${this.url}`);
    }
    else {
      console.debug(`# focus ${this.url}`);

      if (this.sketch.geometry.z === getZIndexOfTopCard()) {
        // console.log('skip: ' + cardProp.geometry.z);
        // console.log([...cacheOfCard.values()].map(myCard => myCard.geometry.z));
        return;
      }
      // console.log([...cacheOfCard.values()].map(myCard => myCard.geometry.z));

      const zIndex = getZIndexOfTopCard() + 1;
      // console.debug(`new zIndex: ${zIndex}`);

      this.window.webContents.send('card-focused', zIndex);

      const newGeom = { ...this.sketch.geometry, z: zIndex };

      // Async
      this._note.updateCardGeometry(this.url, newGeom);
      // console.log([...cacheOfCard.values()].map(myCard => myCard.geometry.z));
      // NOTE: When bring-to-front is invoked by focus event, the card has been already brought to front.

      const backToFront = [...cacheOfCard.values()].sort((a, b) => {
        if (a.sketch.geometry.z > b.sketch.geometry.z) return 1;
        if (a.sketch.geometry.z < b.sketch.geometry.z) return -1;
        return 0;
      });
      setZIndexOfTopCard(backToFront[backToFront.length - 1].sketch.geometry.z);
      setZIndexOfBottomCard(backToFront[0].sketch.geometry.z);
    }
  };

  private _blurListener = () => {
    if (this.suppressBlurEventOnce) {
      console.debug(`skip blur event listener ${this.url}`);
      this.suppressBlurEventOnce = false;
    }
    else {
      console.debug(`# blur ${this.url}`);
      this.window.webContents.send('card-blurred');
    }
  };

  public removeWindowListenersExceptClosedEvent = () => {
    this.window.off('will-resize', this._willResizeListener);
    this.window.off('will-move', this._willMoveListener);
    this.window.off('focus', this._focusListener);
    this.window.off('blur', this._blurListener);
  };

  public removeWindowListeners = () => {
    this.removeWindowListenersExceptClosedEvent();
    this.window.off('closed', this._closedListener);
  };

  public render = async () => {
    await this._loadHTML().catch(e => {
      throw new Error(`Error in render(): ${e.message}`);
    });
    await this.renderCard().catch(e => {
      throw new Error(`Error in _renderCard(): ${e.message}`);
    });
  };

  renderCard = (): Promise<void> => {
    return new Promise(resolve => {
      this.window.setSize(this.sketch.geometry.width, this.sketch.geometry.height);
      this.window.setPosition(this.sketch.geometry.x, this.sketch.geometry.y);
      console.debug(`renderCard in main [${this.url}] ${this.body._body.substr(0, 40)}`);
      this.window.showInactive();
      this.window.webContents.send('render-card', this.url, this.body, this.sketch); // CardProp must be serialize because passing non-JavaScript objects to IPC methods is deprecated and will throw an exception beginning with Electron 9.
      const checkTimer = setInterval(() => {
        if (this.renderingCompleted) {
          clearInterval(checkTimer);
          resolve();
        }
      }, 200);
    });
  };

  private _loadHTML: () => Promise<void> = () => {
    return new Promise((resolve, reject) => {
      const finishLoadListener = (event: Electron.IpcMainInvokeEvent) => {
        console.debug('loadHTML  ' + this.url);
        const finishReloadListener = () => {
          console.debug('Reloaded: ' + this.url);
          this.window.webContents.send('render-card', this.url, this.body, this.sketch);
        };

        // Don't use 'did-finish-load' event.
        // loadHTML resolves after loading HTML and processing required script are finished.
        //     this.window.webContents.on('did-finish-load', () => {
        const handler = 'finish-load-' + encodeURIComponent(this.url);
        handlers.push(handler);
        ipcMain.handle(handler, finishReloadListener);
        resolve();
      };
      ipcMain.handleOnce('finish-load-' + encodeURIComponent(this.url), finishLoadListener);

      this.window.webContents.on(
        'did-fail-load',
        (event, errorCode, errorDescription, validatedURL) => {
          reject(new Error(`Error in loadHTML: ${validatedURL} ${errorDescription}`));
        }
      );

      this.window.loadURL(this.indexUrl);
    });
  };
}
