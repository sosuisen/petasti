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
import {
  CardCondition,
  CardProp,
  CardStatus,
  CardStyle,
  CartaDate,
  Geometry,
  ICard,
} from '../modules_common/types';
import { currentCardMap } from './card_map';
import { setContextMenu } from './card_context_menu';
import { INote } from './note_types';
import { getZIndexOfTopCard } from './card_zindex';

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
  partialCardProp: Partial<CardProp>
): Promise<void> => {
  // Overwrite z
  if (partialCardProp.geometry !== undefined) {
    partialCardProp.geometry.z = getZIndexOfTopCard() + 1;
  }
  const card = new Card(note, partialCardProp);

  currentCardMap.set(card.url, card);

  const newCardProp = card.toObject();
  // Async
  note.updateCard(newCardProp);

  await card.render();
  console.debug(`focus in createCardWindow: ${card.url}`);
  card.window.focus();
};

/**
 * Card class
 */
export class Card implements ICard {
  /**
   * CardProp
   */
  public version = CARD_VERSION;
  public url: string;
  public type = 'text/html';
  public user = 'local';
  public geometry: Geometry = DEFAULT_CARD_GEOMETRY;
  public style: CardStyle = DEFAULT_CARD_STYLE;
  public condition: CardCondition = DEFAULT_CARD_CONDITION;
  public date: CartaDate = {
    createdDate: getCurrentDateAndTime(),
    modifiedDate: getCurrentDateAndTime(),
  };

  public _body = '';

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
  constructor (note: INote, noteIdOrCardProp: string | Partial<CardProp>) {
    if (typeof noteIdOrCardProp === 'string') {
      // Create card with default properties

      const noteId = noteIdOrCardProp;
      const cardId = generateNewCardId();
      this.url = `${APP_SCHEME}://local/${noteId}/${cardId}`;
    }
    else {
      // Create card with specified CardProp

      const cardProp = noteIdOrCardProp;
      this.version = cardProp.version ?? this.version!;
      this.url = cardProp.url!;
      this.type = cardProp.type ?? this.type!;
      this.user = cardProp.user ?? this.user!;

      if (
        cardProp.geometry !== undefined &&
        cardProp.geometry.x !== undefined &&
        cardProp.geometry.y !== undefined &&
        cardProp.geometry.z !== undefined &&
        cardProp.geometry.width !== undefined &&
        cardProp.geometry.height !== undefined
      ) {
        this.geometry = { ...cardProp.geometry };
        this.geometry.x = Math.round(this.geometry.x);
        this.geometry.y = Math.round(this.geometry.y);
        this.geometry.z = Math.round(this.geometry.z);
        this.geometry.width = Math.round(this.geometry.width);
        this.geometry.height = Math.round(this.geometry.height);
      }

      if (
        cardProp.style !== undefined &&
        cardProp.style.backgroundColor !== undefined &&
        cardProp.style.opacity !== undefined &&
        cardProp.style.uiColor !== undefined &&
        cardProp.style.zoom !== undefined
      ) {
        this.style = { ...cardProp.style };
      }

      if (cardProp.condition !== undefined && cardProp.condition.locked !== undefined) {
        this.condition = { ...cardProp.condition };
      }

      if (
        cardProp.date !== undefined &&
        cardProp.date.createdDate !== undefined &&
        cardProp.date.modifiedDate !== undefined
      ) {
        this.date = { ...cardProp.date };
      }

      this._body = cardProp._body ?? this._body!;
    }

    this.indexUrl = url.format({
      pathname: path.join(__dirname, '../index.html'),
      protocol: 'file:',
      slashes: true,
      query: {
        cardUrl: this.url,
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

    this._debouncedCardPositionUpdateActionQueue.subscribe(rect => {
      note.updateCardSketch(this.toObject());
    });
    this._debouncedCardSizeUpdateActionQueue.subscribe(rect => {
      note.updateCardSketch(this.toObject());
    });
  }

  private _debouncedCardPositionUpdateActionQueue = new DebounceQueue(1000);
  private _debouncedCardSizeUpdateActionQueue = new DebounceQueue(1000);

  private _willMoveListener = (event: Electron.Event, rect: Electron.Rectangle) => {
    // Update x and y
    this.geometry.x = rect.x;
    this.geometry.y = rect.y;
    this._debouncedCardPositionUpdateActionQueue.next(rect);
    this.window.webContents.send('move-by-hand', rect);
  };

  private _willResizeListener = (event: Electron.Event, rect: Electron.Rectangle) => {
    // Update x, y, width, height
    this.geometry.x = rect.x;
    this.geometry.y = rect.y;
    this.geometry.width = rect.width;
    this.geometry.height = rect.height;
    this._debouncedCardSizeUpdateActionQueue.next(rect);
    this.window.webContents.send('resize-by-hand', rect);
  };

  private _closedListener = () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    this.removeWindowListeners();

    currentCardMap.delete(this.url);

    // Emit window-all-closed event explicitly
    // because Electron sometimes does not emit it automatically.
    if (currentCardMap.size === 0) {
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
      this.window.webContents.send('card-focused');
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
      this.window.setSize(this.geometry.width, this.geometry.height);
      this.window.setPosition(this.geometry.x, this.geometry.y);
      console.debug(`renderCard in main [${this.url}] ${this._body.substr(0, 40)}`);
      this.window.showInactive();
      this.window.webContents.send('render-card', this.toObject()); // CardProp must be serialize because passing non-JavaScript objects to IPC methods is deprecated and will throw an exception beginning with Electron 9.
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
          this.window.webContents.send('render-card', this.toObject());
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

  public toObject = (): CardProp => {
    return {
      version: this.version,
      url: this.url,
      type: this.type,
      user: this.user,
      geometry: { ...this.geometry },
      style: { ...this.style },
      condition: { ...this.condition },
      date: { ...this.date },
      _body: this._body,
    };
  };
}
