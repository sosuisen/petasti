/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import url from 'url';
import path from 'path';
import { app, BrowserWindow, globalShortcut, ipcMain, shell } from 'electron';
import { DebounceQueue } from 'rx-queue';
import { TaskMetadata } from 'git-documentdb';
import bezier from 'bezier-easing';
import {
  generateNewCardId,
  getCardIdFromUrl,
  getCurrentDateAndTime,
  getRandomInt,
  getSketchIdFromUrl,
} from '../modules_common/utils';
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
  CardBody,
  CardPositionDebounceItem,
  CardSketch,
  CardStatus,
  ICard,
  RendererConfig,
} from '../modules_common/types';
import { cacheOfCard } from './card_cache';
import { setContextMenu } from './card_context_menu';
import { INote } from './note_types';
import {
  getZIndexOfTopCard,
  setZIndexOfBottomCard,
  setZIndexOfTopCard,
} from './card_zindex';
import { messagesRenderer } from './messages';
import { cardColors, ColorName, darkenHexColor } from '../modules_common/color';

/**
 * Easing
 */
const easing = bezier(0.42, 0, 0.58, 1);

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

const sortCards = () => {
  const backToFront = [...cacheOfCard.values()].sort((a, b) => {
    /*
    if (a.sketch.geometry === undefined) {
      console.log('# geometry undefined: ' + JSON.stringify(a.sketch));
      return 0;
    }
    if (b.sketch.geometry === undefined) {
      console.log('# geometry undefined: ' + JSON.stringify(b.sketch));
      return 0;
    }
    */
    if (a.sketch.geometry.z > b.sketch.geometry.z) return 1;
    if (a.sketch.geometry.z < b.sketch.geometry.z) return -1;
    return 0;
  });
  if (backToFront.length > 0) {
    setZIndexOfTopCard(backToFront[backToFront.length - 1].sketch.geometry.z);
    setZIndexOfBottomCard(backToFront[0].sketch.geometry.z);
  }
  return backToFront;
};

export const sortCardWindows = () => {
  const backToFront = sortCards();
  backToFront.forEach(card => {
    if (card.window && !card.window.isDestroyed()) {
      if (card.window.isMinimized()) {
        card.window.restore();
      }
      card.window.moveTop();
    }
  });
  return backToFront;
};

/**
 * Create card
 */
let color = { ...cardColors };
// @ts-ignore
delete color.transparent;

export const createRandomColorCard = async (note: INote) => {
  const geometry = { ...DEFAULT_CARD_GEOMETRY };
  geometry.x += getRandomInt(30, 100);
  geometry.y += getRandomInt(30, 100);

  let colorList = Object.entries(color);
  if (colorList.length === 0) {
    color = { ...cardColors };
    // @ts-ignore
    delete color.transparent;
    colorList = Object.entries(color);
  }
  const newColor: ColorName = colorList[getRandomInt(0, colorList.length)][0] as ColorName;
  delete color[newColor];

  const bgColor: string = cardColors[newColor];

  const cardId = generateNewCardId();

  const newUrl = `${APP_SCHEME}://local/${note.settings.currentNoteId}/${cardId}`;

  const cardSketch: Partial<CardSketch> = {
    geometry,
    style: {
      uiColor: darkenHexColor(bgColor),
      backgroundColor: bgColor,
      opacity: 1.0,
      zoom: 1.0,
    },
  };

  await createCardWindow(note, newUrl, {}, cardSketch);
};

export const createCardWindow = async (
  note: INote,
  noteIdOrUrl: string,
  partialCardBody: Partial<CardBody>,
  partialCardSketch: Partial<CardSketch>
): Promise<void> => {
  // Overwrite z
  if (partialCardSketch.geometry !== undefined) {
    partialCardSketch.geometry.z = getZIndexOfTopCard() + 1;
  }
  const card = new Card(note, noteIdOrUrl, partialCardBody, partialCardSketch);
  // Async
  note.createCard(card.url, card);

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
    type: 'text/markdown',
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
    let cardId: string;
    let sketchId: string;
    if (!noteIdOrUrl.startsWith(APP_SCHEME)) {
      // Create card with default properties
      const noteId = noteIdOrUrl;
      cardId = generateNewCardId();
      this.url = `${APP_SCHEME}://local/${noteId}/${cardId}`;
      sketchId = `${noteId}/${cardId}`;
    }
    else {
      this.url = noteIdOrUrl;
      cardId = getCardIdFromUrl(this.url);
      sketchId = getSketchIdFromUrl(this.url);
    }

    // Create card with specified CardProp
    this.body = { ...this.body, ...cardBody };
    this.body._id = cardId;

    this.sketch.geometry = { ...this.sketch.geometry, ...cardSketch?.geometry };

    this.sketch.geometry.x = Math.round(this.sketch.geometry.x);
    this.sketch.geometry.y = Math.round(this.sketch.geometry.y);
    this.sketch.geometry.z = Math.round(this.sketch.geometry.z);
    this.sketch.geometry.width = Math.round(this.sketch.geometry.width);
    this.sketch.geometry.height = Math.round(this.sketch.geometry.height);

    this.sketch.style = { ...this.sketch.style, ...cardSketch?.style };

    this.sketch.condition = { ...this.sketch.condition, ...cardSketch?.condition };

    this.sketch._id = sketchId;

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

    this._debouncedCardPositionUpdateActionQueue.subscribe((item: unknown) => {
      note.updateCardGeometry(
        this.url,
        (item as CardPositionDebounceItem).geometry,
        (item as CardPositionDebounceItem).modifiedDate
      );
    });
  }

  private _debouncedCardPositionUpdateActionQueue = new DebounceQueue(1000);

  private _willMoveListener = (event: Electron.Event, rect: Electron.Rectangle) => {
    // Update x and yg
    const geometry = { ...this.sketch.geometry, x: rect.x, y: rect.y };

    const modifiedDate = getCurrentDateAndTime();
    this._debouncedCardPositionUpdateActionQueue.next({ geometry, modifiedDate });
    this.window.webContents.send('move-by-hand', geometry, modifiedDate);
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

    console.log('# closed: ' + this.url);
    console.log('# cacheOfCard ' + cacheOfCard.size);
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
    this._addShortcuts();

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

      const modifiedTime = getCurrentDateAndTime();

      if (this.sketch.geometry.z === getZIndexOfTopCard()) {
        // console.log('skip: ' + cardProp.geometry.z);
        // console.log([...cacheOfCard.values()].map(myCard => myCard.geometry.z));
        this.window.webContents.send('card-focused', undefined, undefined);
        return;
      }
      // console.log([...cacheOfCard.values()].map(myCard => myCard.geometry.z));

      const zIndex = getZIndexOfTopCard() + 1;
      // console.debug(`new zIndex: ${zIndex}`);

      this.window.webContents.send('card-focused', zIndex, modifiedTime);

      const newGeom = { ...this.sketch.geometry, z: zIndex };

      // Async
      this._note.updateCardGeometry(this.url, newGeom, modifiedTime);
      // console.log([...cacheOfCard.values()].map(myCard => myCard.geometry.z));
      // NOTE: When bring-to-front is invoked by focus event, the card has been already brought to front.

      sortCards();
    }
  };

  private _blurListener = () => {
    this._removeShortcuts();

    if (this.suppressBlurEventOnce) {
      console.debug(`skip blur event listener ${this.url}`);
      this.suppressBlurEventOnce = false;
    }
    else {
      console.debug(`# blur ${this.url}`);
      this.window.webContents.send('card-blurred');
    }
  };

  private _moveFromX = 0;
  private _moveFromY = 0;
  private _moveToX = 0;
  private _moveToY = 0;
  private _moveAnimeTimer: NodeJS.Timeout | undefined = undefined;
  private _moveAnimeCurrentTime = 0;
  public setPosition = (x: number, y: number, animation: boolean) => {
    if (!animation) {
      this.window.setPosition(x, y);
    }
    else {
      [this._moveFromX, this._moveFromY] = this.window.getPosition();
      this._moveToX = x;
      this._moveToY = y;
      this._moveAnimeCurrentTime = 0;
      if (this._moveAnimeTimer !== undefined) {
        clearInterval(this._moveAnimeTimer);
      }
      this._moveAnimeTimer = setInterval(() => {
        this._moveAnimeCurrentTime += 0.1;
        const rate = easing(this._moveAnimeCurrentTime);
        if (this._moveAnimeCurrentTime >= 1) {
          clearInterval(this._moveAnimeTimer!);
          this._moveAnimeTimer = undefined;
          this.window.setPosition(this._moveToX, this._moveToY);
        }
        else {
          const nextX = (this._moveToX - this._moveFromX) * rate + this._moveFromX;
          const nextY = (this._moveToY - this._moveFromY) * rate + this._moveFromY;
          this.window.setPosition(Math.floor(nextX), Math.floor(nextY));
        }
      }, 100);
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
      let myOS: 'win32' | 'darwin' | 'linux' = 'win32';
      if (process.platform === 'win32') {
        myOS = 'win32';
      }
      else if (process.platform === 'darwin') {
        myOS = 'darwin';
      }
      else {
        myOS = 'linux';
      }
      const config: RendererConfig = {
        messages: messagesRenderer,
        os: myOS,
      };
      this.window.webContents.send('render-card', this.url, this.body, this.sketch, config);
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

  public moveToNote = async (noteId: string) => {
    const newCardSketch = JSON.parse(JSON.stringify(this.sketch));
    const newSketchId = `${noteId}/${getCardIdFromUrl(this.url)}`;
    const newUrl = `${APP_SCHEME}://local/${newSketchId}`;
    // Overwrite z
    newCardSketch.geometry.z = (await this._note.getZIndexOfTopCard(noteId)) + 1;
    newCardSketch._id = newSketchId;
    this._note
      .createCardSketch(newUrl, newCardSketch, true)
      .then((task: TaskMetadata) => {
        if (task.shortId!.startsWith(this._note.settings.currentNoteId)) {
          return this._note.cardCollection.get(getCardIdFromUrl(newUrl));
        }
        return Promise.reject(new Error('Note does not match.'));
      })
      .then(cardBody => {
        console.log('Save has been completed: ' + newUrl);
        createCardWindow(this._note, newUrl, cardBody!, newCardSketch);
      })
      .catch(e => console.log(e));

    await this._note.deleteCardSketch(this.url);
  };

  public copyToNote = async (noteId: string) => {
    const newCardSketch = JSON.parse(JSON.stringify(this.sketch));
    const newSketchId = `${noteId}/${getCardIdFromUrl(this.url)}`;
    const newUrl = `${APP_SCHEME}://local/${newSketchId}`;
    // Overwrite z
    newCardSketch.geometry.z = (await this._note.getZIndexOfTopCard(noteId)) + 1;
    newCardSketch._id = newSketchId;
    this._note
      .createCardSketch(newUrl, newCardSketch, true)
      .then((task: TaskMetadata) => {
        if (task.shortId!.startsWith(this._note.settings.currentNoteId)) {
          return this._note.cardCollection.get(getCardIdFromUrl(newUrl));
        }
        return Promise.reject(new Error('Note does not match.'));
      })
      .then(cardBody => {
        console.log('Save has been completed: ' + newUrl);
        createCardWindow(this._note, newUrl, cardBody!, newCardSketch);
      })
      .catch(e => console.log(e));
  };

  private _addShortcuts = () => {
    // Available shortcuts
    // https://github.com/electron/electron/blob/main/docs/api/accelerator.md
    let opt = 'Alt';
    if (process.platform === 'darwin') {
      opt = 'Option';
    }

    globalShortcut.register('CommandOrControl+R', () => {
      // Disable reload
      // nop
    });
    globalShortcut.register('CommandOrControl+W', () => {
      // Disable close
      // nop
    });
    globalShortcut.register(opt + '+C', () => {
      // Context menu
      this.window.webContents.sendInputEvent({
        button: 'right',
        type: 'mouseUp',
        x: 30,
        y: 30,
      });
    });
    globalShortcut.register(opt + '+T', () => {
      this._note.tray.popUpContextMenu();
    });
    globalShortcut.registerAll(['CommandOrControl+N', opt + '+N'], () => {
      createRandomColorCard(this._note);
    });
    globalShortcut.registerAll(['CommandOrControl+Shift+N', opt + '+Shift+N'], () => {
      const cardId = generateNewCardId();
      const newUrl = `${APP_SCHEME}://local/${this._note.settings.currentNoteId}/${cardId}`;

      const geometry = { ...DEFAULT_CARD_GEOMETRY };
      geometry.x = this.sketch.geometry.x + 30;
      geometry.y = this.sketch.geometry.y + 30;
      const newBody: Partial<CardBody> = {};
      const newSketch: Partial<CardSketch> = {
        geometry: {
          x: geometry.x,
          y: geometry.y,
          z: geometry.z, // z will be overwritten in createCard()
          width: geometry.width,
          height: geometry.height,
        },
        style: {
          uiColor: this.sketch.style.uiColor,
          backgroundColor: this.sketch.style.backgroundColor,
          opacity: this.sketch.style.opacity,
          zoom: this.sketch.style.zoom,
        },
      };
      createCardWindow(this._note, newUrl, newBody, newSketch);
    });
    globalShortcut.registerAll(['CommandOrControl+Plus', 'CommandOrControl+numadd'], () => {
      this.window.webContents.send('zoom-in');
    });
    globalShortcut.registerAll(['CommandOrControl+-', 'CommandOrControl+numsub'], () => {
      this.window.webContents.send('zoom-out');
    });
  };

  private _removeShortcuts = () => {
    globalShortcut.unregisterAll();
  };
}
