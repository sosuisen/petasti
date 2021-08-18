/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import url from 'url';
import path from 'path';
import contextMenu from 'electron-context-menu';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  MenuItemConstructorOptions,
  shell,
} from 'electron';
import { monotonicFactory } from 'ulid';
import { getCurrentDateAndTime, sleep } from '../modules_common/utils';
import {
  APP_ICON_NAME,
  APP_SCHEME,
  DEFAULT_CARD_CONDITION,
  DEFAULT_CARD_GEOMETRY,
  DIALOG_BUTTON,
  MINIMUM_WINDOW_HEIGHT,
  MINIMUM_WINDOW_WIDTH,
} from '../modules_common/const';
import { cardColors, ColorName, darkenHexColor } from '../modules_common/color';
import { emitter, handlers } from './event';
import { mainStore, MESSAGE } from './note_store';
import {
  CardCondition,
  CardProp,
  CardStatus,
  CardStyle,
  CartaDate,
  Geometry,
} from '../modules_common/types';

/**
 * Const
 */
export const CARD_VERSION = '1.0';

export const DEFAULT_CARD_STYLE: CardStyle = {
  uiColor: '',
  backgroundColor: cardColors.yellow,
  opacity: 1.0,
  zoom: 1.0,
};
DEFAULT_CARD_STYLE.uiColor = darkenHexColor(DEFAULT_CARD_STYLE.backgroundColor);

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
 * Card
 */

export const currentCardMap: Map<string, Card> = new Map();

/**
 * Manage z-index
 */
let zIndexOfTopCard: number;
export const setZIndexOfTopCard = (zIndex: number) => {
  zIndexOfTopCard = zIndex;
};
export const getZIndexOfTopCard = (): number => {
  return zIndexOfTopCard;
};

/**
 * Card ID
 */
export const generateNewCardId = () => {
  const ulid = monotonicFactory();
  return 'c' + ulid(Date.now());
};

/**
 * Card class
 */
export class Card {
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
  constructor (noteIdOrCardProp: string | CardProp) {
    if (typeof noteIdOrCardProp === 'string') {
      // Create card with default properties

      const noteId = noteIdOrCardProp;
      const cardId = generateNewCardId();
      this.url = `${APP_SCHEME}://local/${noteId}/${cardId}`;
    }
    else {
      // Create card with specified CardProp

      const cardProp = noteIdOrCardProp;
      this.version = cardProp.version;
      this.url = cardProp.url;
      this.type = cardProp.type;
      this.user = cardProp.user;

      if (
        cardProp.geometry !== undefined &&
        cardProp.geometry.x !== undefined &&
        cardProp.geometry.y !== undefined &&
        cardProp.geometry.z !== undefined
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

      this._body = cardProp._body;
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

    this.resetContextMenu = setContextMenu(this);

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
  }

  private _willMoveListener = (event: Electron.Event, rect: Electron.Rectangle) => {
    // Update x and y
    // this._debouncedAvatarPositionUpdateActionQueue.next(rect);
    // this.reactiveForwarder({ propertyName: 'geometry', state: rect });
  };

  private _willResizeListener = (event: Electron.Event, rect: Electron.Rectangle) => {
    // Update x, y, width, height
    // this._debouncedAvatarSizeUpdateActionQueue.next(rect);
    // this.reactiveForwarder({ propertyName: 'geometry', state: rect });
  };

  private _closedListener = () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    this.removeWindowListeners();

    currentCardMap.delete(this.url);

    // Emit window-all-closed event explicitly
    // because Electron sometimes does not emit it automatically.
    if (Object.keys(currentCardMap).length === 0) {
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
      console.debug(`focus ${this.url}`);
      this.window.webContents.send('card-focused');
    }
  };

  private _blurListener = () => {
    if (this.suppressBlurEventOnce) {
      console.debug(`skip blur event listener ${this.url}`);
      this.suppressBlurEventOnce = false;
    }
    else {
      console.debug(`blur ${this.url}`);
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
      geometry: this.geometry,
      style: this.style,
      condition: this.condition,
      date: this.date,
      _body: this._body,
    };
  };
}

export const createCard = async (cardProp: CardProp) => {
  /*
  const card = new Card(cardProp);
  cards.set(card.prop._id, card);

  const workspaceUrl = getCurrentWorkspaceUrl();
  const promises = [];
  for (const loc in card.prop.avatars) {
    if (loc.match(workspaceUrl)) {
      const cardUrl = loc + card.prop._id;
      const avatar = new Card(
        new AvatarProp(cardUrl, getCardData(cardUrl), getAvatarProp(cardUrl))
      );
      avatars.set(cardUrl, avatar);
      promises.push(avatar.render());
      getCurrentWorkspace()!.avatars.push(cardUrl);
      promises.push(mainStore.addCardUrl(getCurrentWorkspaceId(), cardUrl));
    }
  }
  await Promise.all(promises).catch(e => {
    console.error(`Error in createCard: ${e.message}`);
  });
  await saveCard(card.prop);
  return prop._id;
*/
};

const saveCard = async (cardProp: CardProp) => {
  /*
  await mainStore.updateOrCreateCardData(cardProp).catch((e: Error) => {
    console.error(`Error in saveCard: ${e.message}`);
  });
  */
};

export const deleteCardWithRetry = async (id: string) => {
  for (let i = 0; i < 5; i++) {
    let doRetry = false;
    // eslint-disable-next-line no-await-in-loop
    await deleteCard(id).catch(e => {
      console.error(`Error in deleteCardWithRetry: ${e.message}`);
      doRetry = true;
    });
    if (!doRetry) {
      break;
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(1000);
    console.debug('retrying delete card ...');
  }
};

export const deleteCard = async (id: string) => {
  /*
  const card = cards.get(id);
  if (!card) {
    console.error(`Error in deleteCard: card does not exist: ${id}`);
    return;
  }

  // Delete all avatar cards

  for (const avatarLocation in card.prop.avatars) {
    const cardUrl = avatarLocation + id;
    // eslint-disable-next-line no-await-in-loop
    await mainStore.deleteCardUrl(getWorkspaceIdFromUrl(cardUrl), cardUrl); // Use await because there is race case.

    const avatar = avatars.get(cardUrl);
    const ws = getCurrentWorkspace();
    if (avatar && ws) {
      ws.avatars = ws.avatars.filter(_url => _url !== cardUrl);
      avatars.delete(cardUrl);
      avatar.window.destroy();
    }
    else {
      removeAvatarFromWorkspace(getWorkspaceIdFromUrl(cardUrl), cardUrl);
    }

  }

  // Delete actual card
  await mainStore
    .deleteCardData(id)
    .catch((e: Error) => {
      throw new Error(`Error in delete-card: ${e.message}`);
    })
    .then(() => {
      console.debug(`deleted : ${id}`);
      // eslint-disable-next-line no-unused-expressions
      cards.delete(id);
    })
    .catch((e: Error) => {
      throw new Error(`Error in destroy window: ${e.message}`);
    });
    */
};

export const deleteAvatar = async (_url: string) => {
  /*
  const avatar = avatars.get(_url);
  if (avatar) {
    avatars.delete(_url);
    if (!avatar.window.isDestroyed()) {
      avatar.window.destroy();
    }
    await mainStore.deleteCardUrl(getCurrentWorkspaceId(), _url);
    const ws = getCurrentWorkspace();
    if (ws) {
      ws.avatars = ws.avatars.filter(cardUrl => cardUrl !== _url);
    }
  }
  const card = getCardFromUrl(_url);
  if (!card) {
    return;
  }
  delete card.prop.avatars[getLocationFromUrl(_url)];
  await saveCard(card.prop);
  */
};

export const updateAvatar = async (cardProp: CardProp) => {
  /*
  const prop = AvatarProp.fromObject(avatarPropObj);
  const card = getCardFromUrl(prop.url);
  if (!card) {
    throw new Error('The card is not registered in cards: ' + prop.url);
  }
  const feature: TransformableFeature = {
    geometry: prop.geometry,
    style: prop.style,
    condition: prop.condition,
    date: prop.date,
  };
  card.prop.data = prop.data;
  card.prop.avatars[getLocationFromUrl(prop.url)] = feature;

  await saveCard(card.prop);
  */
};

/**
 * Context Menu
 */
const setContextMenu = (card: Card) => {
  const setColor = (name: ColorName) => {
    return {
      label: MESSAGE(name),
      click: () => {
        if (name === 'transparent') {
          card.window.webContents.send('change-card-color', cardColors[name], 0.0);
        }
        else {
          card.window.webContents.send('change-card-color', cardColors[name]);
        }
      },
    };
  };

  const moveAvatarToWorkspace = (workspaceId: string) => {
    /*
    removeAvatarFromWorkspace(getCurrentWorkspaceId(), card.url);
    mainStore.deleteCardUrl(getCurrentWorkspaceId(), card.url);
    const newCardUrl = getWorkspaceUrl(workspaceId) + getIdFromUrl(card.url);
    addAvatarToWorkspace(workspaceId, newCardUrl);
    mainStore.addCardUrl(workspaceId, newCardUrl);
    card.window.webContents.send('card-close');

      const avatarProp = card.prop.avatars[getLocationFromUrl(prop.url)];
      delete card.prop.avatars[getLocationFromUrl(prop.url)];
      card.prop.avatars[getLocationFromUrl(newCardUrl)] = avatarProp;
      saveCard(card.prop);
    */
  };

  const copyAvatarToWorkspace = (workspaceId: string) => {
    /*
    const newCardUrl = getWorkspaceUrl(workspaceId) + getIdFromUrl(prop.url);
    if (workspaces.get(workspaceId)?.avatars.includes(newCardUrl)) {
      dialog.showMessageBoxSync(settingsDialog, {
        type: 'question',
        buttons: ['OK'],
        message: MESSAGE('workspaceAvatarExist'),
      });
      return;
    }
    addAvatarToWorkspace(workspaceId, newCardUrl);
    mainStore.addCardUrl(workspaceId, newCardUrl);

    const card = getCardFromUrl(prop.url);
    if (card) {
      const avatarProp = card.prop.avatars[getLocationFromUrl(prop.url)];
      card.prop.avatars[getLocationFromUrl(newCardUrl)] = avatarProp;
      saveCard(card.prop);
    }
    */
  };

  const moveToWorkspaces: MenuItemConstructorOptions[] = [...mainStore.notePropMap.values()]
    .sort((a, b) => {
      if (a.name > b.name) return 1;
      else if (a.name < b.name) return -1;
      return 0;
    })
    .reduce((result, noteProp) => {
      if (noteProp._id !== mainStore.settings.currentNoteId) {
        result.push({
          label: `${noteProp.name}`,
          click: () => {
            moveAvatarToWorkspace(noteProp._id);
          },
        });
      }
      return result;
    }, [] as MenuItemConstructorOptions[]);

  const copyToWorkspaces: MenuItemConstructorOptions[] = [...mainStore.notePropMap.values()]
    .sort((a, b) => {
      if (a.name > b.name) return 1;
      else if (a.name < b.name) return -1;
      return 0;
    })
    .reduce((result, noteProp) => {
      if (noteProp._id !== mainStore.settings.currentNoteId) {
        result.push({
          label: `${noteProp.name}`,
          click: () => {
            copyAvatarToWorkspace(noteProp._id);
          },
        });
      }
      return result;
    }, [] as MenuItemConstructorOptions[]);

  const dispose = contextMenu({
    window: card.window,
    showSaveImageAs: true,
    showInspectElement: false,
    menu: actions => [
      actions.searchWithGoogle({}),
      actions.separator(),
      {
        label: MESSAGE('cut'),
        role: 'cut',
      },
      {
        label: MESSAGE('copy'),
        role: 'copy',
      },
      {
        label: MESSAGE('paste'),
        role: 'paste',
      },
      {
        label: MESSAGE('pasteAndMatchStyle'),
        role: 'pasteAndMatchStyle',
      },
      actions.separator(),
      actions.saveImageAs({}),
      actions.separator(),
      actions.copyLink({}),
      actions.separator(),
    ],
    prepend: () => [
      {
        label: MESSAGE('noteMove'),
        submenu: [...moveToWorkspaces],
      },
      {
        label: MESSAGE('noteCopy'),
        submenu: [...copyToWorkspaces],
      },
      {
        label: MESSAGE('zoomIn'),
        click: () => {
          card.window.webContents.send('zoom-in');
        },
      },
      {
        label: MESSAGE('zoomOut'),
        click: () => {
          card.window.webContents.send('zoom-out');
        },
      },
      {
        label: MESSAGE('sendToBack'),
        click: () => {
          card.window.webContents.send('send-to-back');
        },
      },
      {
        label: card.condition.locked ? MESSAGE('unlockCard') : MESSAGE('lockCard'),
        click: () => {
          card.condition.locked = !card.condition.locked;
          card.window.webContents.send('set-lock', card.condition.locked);
          resetContextMenu();
        },
      },
    ],
    append: () => [
      setColor('yellow'),
      setColor('red'),
      setColor('green'),
      setColor('blue'),
      setColor('orange'),
      setColor('purple'),
      setColor('white'),
      setColor('gray'),
      setColor('transparent'),
    ],
  });

  const resetContextMenu = () => {
    // @ts-ignore
    dispose();
    setContextMenu(card);
  };

  return resetContextMenu;
};
