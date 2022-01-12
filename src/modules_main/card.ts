/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import url from 'url';
import path from 'path';
import {
  app,
  BrowserWindow,
  Display,
  globalShortcut,
  ipcMain,
  Rectangle,
  screen,
  webFrame,
} from 'electron';
import { TaskMetadata } from 'git-documentdb';
import bezier from 'bezier-easing';
import AsyncLock from 'async-lock';
import {
  generateNewCardId,
  getCardIdFromUrl,
  getCurrentDateAndTime,
  getNoteIdFromUrl,
  getRandomInt,
  getSketchIdFromUrl,
  isLabelOpened,
} from '../modules_common/utils';
import {
  APP_ICON_NAME,
  APP_SCHEME,
  CARD_VERSION,
  DEFAULT_CARD_CONDITION,
  DEFAULT_CARD_GEOMETRY,
  DEFAULT_CARD_LABEL,
  DEFAULT_CARD_STYLE,
  MINIMUM_WINDOW_HEIGHT,
  MINIMUM_WINDOW_WIDTH,
  WINDOW_POSITION_EDGE_MARGIN,
} from '../modules_common/const';
import { handlers } from './event';
import {
  CardBody,
  CardSketch,
  CardStatus,
  Geometry,
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
import { cardColors, ColorName } from '../modules_common/color';
import { noteStore } from './note_store';
import { openURL } from './url_schema';

type AccelCheck = {
  prevTime: number;
  count: number;
};

const lock = new AsyncLock();

/**
 * Change unit
 */
const positionChangeUnitSmall = 10;
const positionChangeUnitMiddle = 20;
const positionChangeUnitHigh = 60;
const sizeChangeUnitSmall = 10;
const sizeChangeUnitMiddle = 20;
const sizeChangeUnitHigh = 60;

const arrowKeyAccelCancelMsec = 100;
const arrowKeyMiddleAccelCount = 3;
const arrowKeyHighAccelCount = 10;

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

export const sortCardWindows = (suppressFocus = false) => {
  const backToFront = sortCards();
  backToFront.forEach(card => {
    if (card.window && !card.window.isDestroyed()) {
      if (suppressFocus) card.suppressFocusEvent = true;

      if (card.window.isMinimized()) {
        card.window.restore();
      }
      card.window.moveTop();

      // !ALERT: Dirty hack not to call updateCardSketchDoc
      if (suppressFocus) {
        setTimeout(() => {
          card.suppressFocusEvent = false;
        }, 3000);
      }
    }
  });
  if (backToFront.length > 0) {
    backToFront[backToFront.length - 1].focus();
  }
  return backToFront;
};

/**
 * Create card
 */
let color = { ...cardColors };
// @ts-ignore
delete color.transparent;

export const createRandomColorCard = async (
  note: INote,
  body: Partial<CardBody> = {},
  sketch: Partial<CardSketch> = {}
) => {
  let geometry: Geometry;
  if (sketch.geometry) {
    geometry = sketch.geometry;
  }
  else {
    geometry = { ...DEFAULT_CARD_GEOMETRY };
    geometry.x += getRandomInt(30, 100);
    geometry.y += getRandomInt(30, 100);
  }

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
    ...sketch,
    geometry,
    style: {
      uiColor: bgColor,
      backgroundColor: bgColor,
      opacity: 1.0,
      zoom: 1.0,
    },
  };

  await createCardWindow(note, newUrl, body, cardSketch);
};

export const createCardWindow = async (
  note: INote,
  noteIdOrUrl: string,
  partialCardBody: Partial<CardBody>,
  partialCardSketch: Partial<CardSketch>,
  updateDB = true
): Promise<void> => {
  // Overwrite z
  if (partialCardSketch.geometry !== undefined) {
    partialCardSketch.geometry.z = getZIndexOfTopCard() + 1;
  }
  const card = new Card(note, noteIdOrUrl, partialCardBody, partialCardSketch);

  // Async
  note.createCard(card.url, card, false, updateDB);

  await card.render();
  console.debug(`focus in createCardWindow: ${card.url}`);
  card.focus();
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
    label: DEFAULT_CARD_LABEL,
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
  public suppressFocusEvent = false;
  public suppressFocusEventOnce = false;
  public suppressBlurEventOnce = false;
  public recaptureGlobalFocusEventAfterLocalFocusEvent = false;

  /**
   * Selection
   */
  public hasSelection = false;

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

    this.sketch.label = { ...this.sketch.label, ...cardSketch?.label };

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

    let bounds: Rectangle;
    if (isLabelOpened(this.sketch.label.status)) {
      bounds = {
        x: this.sketch.label.x!,
        y: this.sketch.label.y!,
        width: this.sketch.label.width!,
        height: this.sketch.label.height!,
      };
    }
    else {
      bounds = {
        x: this.sketch.geometry.x!,
        y: this.sketch.geometry.y!,
        width: this.sketch.geometry.width!,
        height: this.sketch.geometry.height!,
      };
    }
    // this.window.setBounds(bounds);

    this.window = new BrowserWindow({
      webPreferences: {
        preload: path.join(__dirname, './preload.js'),
        sandbox: true,
        contextIsolation: true,
      },
      minWidth: MINIMUM_WINDOW_WIDTH,
      minHeight: MINIMUM_WINDOW_HEIGHT,

      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,

      acceptFirstMouse: true, // for MacOS

      // NOTE: Window snap on windows is disable
      //   if transparent is true or frame is false or maximizable is false.
      transparent: true,
      frame: false,
      maximizable: false,

      // show: false,

      fullscreenable: false,

      icon: path.join(__dirname, `../assets/${APP_ICON_NAME}`),
    });
    this.window.setMaxListeners(20);

    if (!app.isPackaged && process.env.NODE_ENV === 'development') {
      // this.window.webContents.openDevTools();
    }

    // Resized by hand
    // will-resize is only emitted when the window is being resized manually.
    // Resizing the window with setBounds/setSize will not emit this event.
    this.window.on('will-resize', this._willResizeListener);

    // Moved by hand
    // this.window.on('will-move', this._willMoveListener);

    this.window.on('closed', this._closedListener);

    this.resetContextMenu = setContextMenu(note, this);

    // Open hyperlink on external browser window
    // by preventing to open it on new electron window
    // when target='_blank' is set.
    this.window.webContents.on('new-window', (e, _url) => {
      e.preventDefault();
      openURL(_url);
      // shell.openExternal(_url);
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

    /*
    this._debouncedCardPositionUpdateActionQueue.subscribe((item: unknown) => {
      const newSketch: CardSketch = JSON.parse(JSON.stringify(this.sketch));
      newSketch.geometry.x = (item as CardPositionDebounceItem).cardX;
      newSketch.geometry.y = (item as CardPositionDebounceItem).cardY;
      newSketch.label.x = (item as CardPositionDebounceItem).labelX;
      newSketch.label.y = (item as CardPositionDebounceItem).labelY;
      note.updateCardSketch(
        this.url,
        newSketch,
        (item as CardPositionDebounceItem).modifiedDate
      );
    });
    */
  }

  // private _debouncedCardPositionUpdateActionQueue = new DebounceQueue(1000);

  private _willResizeListener = (event: Electron.Event, rect: Electron.Rectangle) => {
    let newWidth = rect.width;
    let newHeight = rect.height;
    /*
    console.log(`willResize rect: ${JSON.stringify(rect)}`);
    console.log(
      `willResize bounds: ${JSON.stringify(
        this.window.getNormalBounds()
      )}, ${JSON.stringify(this.window.getContentBounds())}`
    );
    */

    let adjustSize = false;
    if (newWidth < MINIMUM_WINDOW_WIDTH) {
      newWidth = MINIMUM_WINDOW_WIDTH;
      adjustSize = true;
    }
    if (newHeight < MINIMUM_WINDOW_HEIGHT) {
      newHeight = MINIMUM_WINDOW_HEIGHT;
      adjustSize = true;
    }
    // Update x, y, width, height
    const geometry = {
      ...this.sketch.geometry,
      x: rect.x,
      y: rect.y,
      width: newWidth,
      height: newHeight,
    };

    if (adjustSize) {
      this.window.setSize(newWidth, newHeight);
      event.preventDefault();
    }

    this.window.webContents.send('resize-by-hand', geometry);
  };

  private _closedListener = () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    this.removeWindowListeners();

    this._removeShortcuts();

    cacheOfCard.delete(this.url);

    console.log('# closed: ' + this.url);
    console.log('# cacheOfCard ' + cacheOfCard.size);
    // Emit window-all-closed event explicitly
    // because Electron sometimes does not emit it automatically.
    if (cacheOfCard.size === 0) {
      app.emit('window-all-closed');
    }
  };

  public focus = () => {
    this.window.focus();
    // this.status = 'Focused'; // Set the focus status just in case
    this._focusListener(); // Call the listener just in case
  };

  /**
   * _focusListener in Main Process
   * After startup, the first window.onfocus event is not invoked in Renderer Process.
   * Listen focus event in Main Process.
   */
  private _focusListener = () => {
    if (this.status === 'Focused') return;
    this.status = 'Focused';
    if (this.recaptureGlobalFocusEventAfterLocalFocusEvent) {
      this.recaptureGlobalFocusEventAfterLocalFocusEvent = false;
      setGlobalFocusEventListenerPermission(true);
    }
    if (this.suppressFocusEventOnce || this.suppressFocusEvent) {
      console.debug(`skip focus event listener ${this.url}`);
      this.suppressFocusEventOnce = false;
    }
    else if (!getGlobalFocusEventListenerPermission()) {
      console.debug(`focus event listener is suppressed ${this.url}`);
    }
    else {
      console.debug(`# focus ${this.url}`);

      this._addShortcuts();

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

      // const newGeom = { ...this.sketch.geometry, z: zIndex };

      // Async
      this._note.updateCardZ(this.url, zIndex, modifiedTime);
      // console.log([...cacheOfCard.values()].map(myCard => myCard.sketch.geometry.z));
      // NOTE: When bring-to-front is invoked by focus event, the card has been already brought to front.

      sortCards();
    }
  };

  private _blurListener = () => {
    this.status = 'Blurred';
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

  private _currentMoveToX = 0;
  private _currentMoveToY = 0;
  private _currentMoveToWidth = 0;
  private _currentMoveToHeight = 0;

  public setRect = (
    x: number,
    y: number,
    width: number,
    height: number,
    animation: boolean
  ): Promise<void> => {
    return new Promise(resolve => {
      if (!animation) {
        this.window.setPosition(x, y);
        this.window.setSize(width, height);
        resolve();
      }
      else {
        let moveFromX = 0;
        let moveFromY = 0;
        let moveFromWidth = 0;
        let moveFromHeight = 0;
        let moveToX = 0;
        let moveToY = 0;
        let moveToWidth = 0;
        let moveToHeight = 0;

        let moveAnimeCurrentTime = 0;
        // [this._moveFromX, this._moveFromY] = this.window.getPosition();
        const rect = this.window.getContentBounds();
        moveFromX = rect.x;
        moveFromY = rect.y;
        moveFromWidth = rect.width;
        moveFromHeight = rect.height;
        this._currentMoveToX = moveToX = x;

        this._currentMoveToY = moveToY = y;
        this._currentMoveToWidth = moveToWidth = width;
        this._currentMoveToHeight = moveToHeight = height;

        moveAnimeCurrentTime = 0;

        let moveAnimeTimer: NodeJS.Timeout | undefined = setInterval(() => {
          moveAnimeCurrentTime += 0.1;
          const rate = easing(moveAnimeCurrentTime);
          if (
            moveToX !== this._currentMoveToX ||
            moveToY !== this._currentMoveToY ||
            moveToWidth !== this._currentMoveToWidth ||
            moveToHeight !== this._currentMoveToHeight
          ) {
            // Another animation has started.
            if (moveAnimeTimer) {
              clearInterval(moveAnimeTimer!);
              moveAnimeTimer = undefined;
              resolve();
            }
          }
          else if (moveAnimeCurrentTime >= 1) {
            if (moveAnimeTimer) {
              clearInterval(moveAnimeTimer!);
              moveAnimeTimer = undefined;

              this.window.setBounds({
                x: moveToX,
                y: moveToY,
                width: moveToWidth,
                height: moveToHeight,
              });
              resolve();
            }
          }
          else {
            const nextX = (moveToX - moveFromX) * rate + moveFromX;
            const nextY = (moveToY - moveFromY) * rate + moveFromY;
            const nextWidth = (moveToWidth - moveFromWidth) * rate + moveFromWidth;
            const nextHeight = (moveToHeight - moveFromHeight) * rate + moveFromHeight;
            // this.window.setPosition(Math.floor(nextX), Math.floor(nextY));
            this.window.setBounds({
              x: Math.floor(nextX),
              y: Math.floor(nextY),
              width: Math.floor(nextWidth),
              height: Math.floor(nextHeight),
            });
          }
        }, 20);
      }
    });
  };

  public removeWindowListenersExceptClosedEvent = () => {
    this.window.off('will-resize', this._willResizeListener);
    this.window.off('focus', this._focusListener);
    this.window.off('blur', this._blurListener);
  };

  public removeWindowListeners = () => {
    this.removeWindowListenersExceptClosedEvent();
    this.window.off('closed', this._closedListener);
  };

  public render = async () => {
    // console.time('loadHTML');
    await this._loadHTML().catch(e => {
      throw new Error(`Error in render(): ${e.message}`);
    });
    // console.timeEnd('loadHTML');
    // console.time('renderCard');
    await this.renderCard().catch(e => {
      throw new Error(`Error in _renderCard(): ${e.message}`);
    });
    // console.timeEnd('renderCard');
  };

  renderCard = (): Promise<void> => {
    return new Promise(resolve => {
      console.debug(`renderCard in main [${this.url}] ${this.body._body.substr(0, 40)}`);

      // this.window.showInactive();
      console.log('# Added focusListener');
      this.window.on('focus', this._focusListener);
      this.window.on('blur', this._blurListener);

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
        isResident: noteStore.getState().get(getNoteIdFromUrl(this.url))!.isResident,
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
        // console.debug('loadHTML  ' + this.url);
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
    const notCurrentNoteMsg =
      'The destination is not the current note. (This is not an error.)';
    this._note
      .createCardSketch(newUrl, newCardSketch, true)
      .then((task: TaskMetadata) => {
        // When moveToNote is called from archive window, a card may move to the current note.
        if (task.shortId!.startsWith(this._note.settings.currentNoteId)) {
          return this._note.cardCollection.get(getCardIdFromUrl(newUrl));
        }
        return Promise.reject(new Error(notCurrentNoteMsg));
      })
      .then(cardBody => {
        console.log('Moved to the current note: ' + newUrl);
        createCardWindow(this._note, newUrl, cardBody!, newCardSketch);
      })
      // createCardSketch throws error when the same sketch exists.
      .catch((e: Error) => {
        if (!e.message.endsWith(notCurrentNoteMsg)) console.log(e);
      });

    await this._note.deleteCardSketch(this.url);
  };

  public copyToNote = async (noteId: string) => {
    const newCardSketch = JSON.parse(JSON.stringify(this.sketch));
    const newSketchId = `${noteId}/${getCardIdFromUrl(this.url)}`;
    const newUrl = `${APP_SCHEME}://local/${newSketchId}`;
    // Overwrite z
    newCardSketch.geometry.z = (await this._note.getZIndexOfTopCard(noteId)) + 1;
    newCardSketch._id = newSketchId;
    const notCurrentNoteMsg =
      'The destination is not the current note. (This is not an error.)';
    this._note
      .createCardSketch(newUrl, newCardSketch, true)
      .then((task: TaskMetadata) => {
        // When copyToNote is called from archive window, a card may copy to the current note.
        if (task.shortId!.startsWith(this._note.settings.currentNoteId)) {
          return this._note.cardCollection.get(getCardIdFromUrl(newUrl));
        }
        return Promise.reject(new Error(notCurrentNoteMsg));
      })
      .then(cardBody => {
        console.log('Save has been completed: ' + newUrl);
        createCardWindow(this._note, newUrl, cardBody!, newCardSketch);
      })
      // createCardSketch throws error when the same sketch exists.
      .catch((e: Error) => {
        if (!e.message.endsWith(notCurrentNoteMsg)) console.log(e);
      });
  };

  private _moveByKey = (x: number, y: number) => {
    this.window.setPosition(x, y);

    let width, height: number;
    if (isLabelOpened(this.sketch.label.status)) {
      width = this.sketch.label.width!;
      height = this.sketch.label.height!;
    }
    else {
      width = this.sketch.geometry.width;
      height = this.sketch.geometry.height;
    }
    const geometry = {
      x,
      y,
      z: this.sketch.geometry.z,
      width,
      height,
    };

    this.window.webContents.send('move-by-hand', geometry);
  };

  private _resizeByKey = (width: number, height: number) => {
    this.window.setSize(width, height);
    let x, y: number;
    if (isLabelOpened(this.sketch.label.status)) {
      x = this.sketch.label.x!;
      y = this.sketch.label.y!;
    }
    else {
      x = this.sketch.geometry.x;
      y = this.sketch.geometry.y;
    }
    const geometry = {
      x,
      y,
      z: this.sketch.geometry.z,
      width,
      height,
    };

    const modifiedDate = getCurrentDateAndTime();
    this.window.webContents.send('resize-by-hand', geometry, modifiedDate);
  };

  private _accelCheck: {
    up: AccelCheck;
    down: AccelCheck;
    left: AccelCheck;
    right: AccelCheck;
  } = {
    up: {
      prevTime: 0,
      count: 0,
    },
    down: {
      prevTime: 0,
      count: 0,
    },
    left: {
      prevTime: 0,
      count: 0,
    },
    right: {
      prevTime: 0,
      count: 0,
    },
  };

  // eslint-disable-next-line complexity
  private _getChangeUnit = (
    arrow: 'up' | 'down' | 'left' | 'right',
    type: 'position' | 'size'
  ) => {
    if (arrow !== 'up') {
      this._accelCheck.up.prevTime = 0;
      this._accelCheck.up.count = 0;
    }
    if (arrow !== 'down') {
      this._accelCheck.down.prevTime = 0;
      this._accelCheck.down.count = 0;
    }
    if (arrow !== 'left') {
      this._accelCheck.left.prevTime = 0;
      this._accelCheck.left.count = 0;
    }
    if (arrow !== 'right') {
      this._accelCheck.right.prevTime = 0;
      this._accelCheck.right.count = 0;
    }
    const now = Date.now();
    if (now - this._accelCheck[arrow].prevTime < arrowKeyAccelCancelMsec) {
      this._accelCheck[arrow].count++;
    }
    else {
      this._accelCheck[arrow].count = 0;
    }
    this._accelCheck[arrow].prevTime = now;
    if (this._accelCheck[arrow].count > arrowKeyHighAccelCount) {
      return type === 'position' ? positionChangeUnitHigh : sizeChangeUnitHigh;
    }
    if (this._accelCheck[arrow].count > arrowKeyMiddleAccelCount) {
      return type === 'position' ? positionChangeUnitMiddle : sizeChangeUnitMiddle;
    }
    return type === 'position' ? positionChangeUnitSmall : sizeChangeUnitSmall;
  };

  private _addShortcuts = () => {
    lock.acquire('registerShortcut', () => {
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
        if (this.status === 'Blurred') return;
        if (!this.window || this.window.isDestroyed() || !this.window.webContents) return;
        // Context menu
        this.window.webContents.sendInputEvent({
          button: 'right',
          type: 'mouseUp',
          x: 30,
          y: 30,
        });
      });
      globalShortcut.register(opt + '+T', () => {
        if (this.status === 'Blurred') return;
        this._note.tray.popUpContextMenu();
      });
      globalShortcut.registerAll(['CommandOrControl+N', opt + '+N'], () => {
        if (this.status === 'Blurred') return;
        createRandomColorCard(this._note);
      });
      globalShortcut.registerAll(['CommandOrControl+Shift+N', opt + '+Shift+N'], () => {
        if (this.status === 'Blurred') return;
        const cardId = generateNewCardId();
        const newUrl = `${APP_SCHEME}://local/${this._note.settings.currentNoteId}/${cardId}`;

        const geometry = { ...DEFAULT_CARD_GEOMETRY };
        geometry.x = this.sketch.geometry.x + 30;
        geometry.y = this.sketch.geometry.y + 30;
        geometry.width = this.sketch.geometry.width;
        geometry.height = this.sketch.geometry.height;

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
      globalShortcut.registerAll(
        ['CommandOrControl+Plus', 'CommandOrControl+numadd'],
        () => {
          if (this.status === 'Blurred') return;
          if (!this.window || this.window.isDestroyed() || !this.window.webContents) return;
          this.window.webContents.send('zoom-in');
        }
      );
      globalShortcut.registerAll(['CommandOrControl+-', 'CommandOrControl+numsub'], () => {
        if (this.status === 'Blurred') return;
        if (!this.window || this.window.isDestroyed() || !this.window.webContents) return;
        this.window.webContents.send('zoom-out');
      });

      globalShortcut.register('CommandOrControl+' + opt + '+Up', () => {
        if (this.status === 'Blurred') return;
        if (!this.window || this.window.isDestroyed() || !this.window.webContents) return;
        const changeUnit = this._getChangeUnit('up', 'position');
        const [oldX, oldY] = this.window.getPosition();
        let newY = oldY - changeUnit;

        const displayRect: Display = screen.getDisplayNearestPoint({ x: oldX, y: newY });
        if (newY < displayRect.bounds.y) newY = displayRect.bounds.y;

        this._moveByKey(oldX, newY);
      });
      globalShortcut.register('CommandOrControl+' + opt + '+Down', () => {
        if (this.status === 'Blurred') return;
        if (!this.window || this.window.isDestroyed() || !this.window.webContents) return;
        const changeUnit = this._getChangeUnit('down', 'position');
        const rect = this.window.getBounds();
        const oldX = rect.x;
        const oldY = rect.y;
        const oldHeight = rect.height;

        let newY = oldY + changeUnit;

        const displayRect: Display = screen.getDisplayNearestPoint({
          x: oldX,
          y: newY + oldHeight,
        });
        if (
          newY >
          displayRect.bounds.y + displayRect.bounds.height - WINDOW_POSITION_EDGE_MARGIN
        ) {
          newY =
            displayRect.bounds.y + displayRect.bounds.height - WINDOW_POSITION_EDGE_MARGIN;
        }

        this._moveByKey(oldX, newY);
      });
      globalShortcut.register('CommandOrControl+' + opt + '+Left', () => {
        if (this.status === 'Blurred') return;
        if (!this.window || this.window.isDestroyed() || !this.window.webContents) return;
        const changeUnit = this._getChangeUnit('left', 'position');
        const rect = this.window.getBounds();
        const oldX = rect.x;
        const oldY = rect.y;
        const oldWidth = rect.width;

        let newX = oldX - changeUnit;

        const displayRect: Display = screen.getDisplayNearestPoint({ x: newX, y: oldY });
        if (newX < displayRect.bounds.x - oldWidth + WINDOW_POSITION_EDGE_MARGIN) {
          newX = displayRect.bounds.x - oldWidth + WINDOW_POSITION_EDGE_MARGIN;
        }

        this._moveByKey(newX, oldY);
      });
      globalShortcut.register('CommandOrControl+' + opt + '+Right', () => {
        if (this.status === 'Blurred') return;
        if (!this.window || this.window.isDestroyed() || !this.window.webContents) return;
        const changeUnit = this._getChangeUnit('right', 'position');
        const rect = this.window.getBounds();
        const oldX = rect.x;
        const oldY = rect.y;
        const oldWidth = rect.width;

        let newX = oldX + changeUnit;

        const displayRect: Display = screen.getDisplayNearestPoint({
          x: newX + oldWidth,
          y: oldY,
        });
        if (
          newX >
          displayRect.bounds.x + displayRect.bounds.width - WINDOW_POSITION_EDGE_MARGIN
        ) {
          newX =
            displayRect.bounds.x + displayRect.bounds.width - WINDOW_POSITION_EDGE_MARGIN;
        }

        this._moveByKey(newX, oldY);
      });

      globalShortcut.register('CommandOrControl+' + opt + '+Shift+Left', () => {
        if (this.status === 'Blurred') return;
        if (!this.window || this.window.isDestroyed() || !this.window.webContents) return;
        const changeUnit = this._getChangeUnit('left', 'size');
        const [oldWidth, oldHeight] = this.window.getSize();
        let newWidth = oldWidth - changeUnit;
        if (newWidth < MINIMUM_WINDOW_WIDTH) newWidth = MINIMUM_WINDOW_WIDTH;
        this._resizeByKey(newWidth, oldHeight);
      });
      globalShortcut.register('CommandOrControl+' + opt + '+Shift+Right', () => {
        if (this.status === 'Blurred') return;
        if (!this.window || this.window.isDestroyed() || !this.window.webContents) return;
        const changeUnit = this._getChangeUnit('right', 'size');
        const [oldWidth, oldHeight] = this.window.getSize();
        const newWidth = oldWidth + changeUnit;
        this._resizeByKey(newWidth, oldHeight);
      });
      globalShortcut.register('CommandOrControl+' + opt + '+Shift+Up', () => {
        if (this.status === 'Blurred') return;
        if (!this.window || this.window.isDestroyed() || !this.window.webContents) return;
        const changeUnit = this._getChangeUnit('up', 'size');
        const [oldWidth, oldHeight] = this.window.getSize();
        let newHeight = oldHeight - changeUnit;
        if (newHeight < MINIMUM_WINDOW_HEIGHT) newHeight = MINIMUM_WINDOW_HEIGHT;
        this._resizeByKey(oldWidth, newHeight);
      });
      globalShortcut.register('CommandOrControl+' + opt + '+Shift+Down', () => {
        if (this.status === 'Blurred') return;
        if (!this.window || this.window.isDestroyed() || !this.window.webContents) return;
        const changeUnit = this._getChangeUnit('down', 'size');
        const [oldWidth, oldHeight] = this.window.getSize();
        const newHeight = oldHeight + changeUnit;
        this._resizeByKey(oldWidth, newHeight);
      });

      globalShortcut.register('CommandOrControl+' + opt + '+Space', () => {
        if (this.status === 'Blurred') return;
        if (!this.window || this.window.isDestroyed() || !this.window.webContents) return;
        if (isLabelOpened(this.sketch.label.status)) {
          this.window.webContents.send('transform-from-label');
        }
        else {
          this.window.webContents.send('transform-to-label');
        }
      });

      // For debugging
      globalShortcut.register('CommandOrControl+' + opt + '+D', () => {
        if (!app.isPackaged && process.env.NODE_ENV === 'development') {
          this.window.webContents.openDevTools();
        }
      });
    });
  };

  private _removeShortcuts = () => {
    lock.acquire('registerShortcut', () => {
      globalShortcut.unregisterAll();
      let opt = 'Alt';
      if (process.platform === 'darwin') {
        opt = 'Option';
      }
      globalShortcut.registerAll([`CommandOrControl+${opt}+Enter`], () => {
        this._note.tray.popUpContextMenu();
      });
    });
  };
}
