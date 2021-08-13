/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import url from 'url';
import path from 'path';
import contextMenu from 'electron-context-menu';

import { v4 as uuidv4 } from 'uuid';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  MenuItemConstructorOptions,
  shell,
} from 'electron';
import {
  AvatarProp,
  AvatarPropSerializable,
  CardProp,
  CardPropSerializable,
  TransformableFeature,
} from '../modules_common/cardprop';
import { sleep } from '../modules_common/utils';
import { CardInitializeType } from '../modules_common/types_cardeditor';
import {
  addAvatarToWorkspace,
  getCurrentWorkspace,
  getCurrentWorkspaceId,
  getCurrentWorkspaceUrl,
  getWorkspaceUrl,
  removeAvatarFromWorkspace,
  workspaces,
} from './store_workspaces';
import { DIALOG_BUTTON } from '../modules_common/const';
import { cardColors, ColorName } from '../modules_common/color';
import {
  getIdFromUrl,
  getLocationFromUrl,
  getWorkspaceIdFromUrl,
} from '../modules_common/avatar_url_utils';
import { emitter, handlers } from './event';
import { settingsDialog } from './settings';
import { mainStore, MESSAGE } from './store';

/**
 * Card
 * Content unit is called 'card'.
 * A card is internally stored as an actual card (a.k.a Card class),
 * and externally represented as one or multiple avatar cards (a.k.a. Avatar class).
 */
export const cards: Map<string, Card> = new Map<string, Card>();

/**
 * Const
 */
const MINIMUM_WINDOW_WIDTH = 185; // 180 + shadowWidth
const MINIMUM_WINDOW_HEIGHT = 80;

const avatars: Map<string, Avatar> = new Map<string, Avatar>();

/**
 * Focus control
 */
let globalFocusListenerPermission = true;
/**
 * Set permission to call focus event listener in all renderer processes.
 */
export const setGlobalFocusEventListenerPermission = (
  canExecuteFocusEventListener: boolean
) => {
  globalFocusListenerPermission = canExecuteFocusEventListener;
};

export const getGlobalFocusEventListenerPermission = () => {
  return globalFocusListenerPermission;
};
export const getAvatarProp = (avatarUrl: string) => {
  return getCardFromUrl(avatarUrl)?.prop.avatars[getLocationFromUrl(avatarUrl)];
};

export const getCardFromUrl = (avatarUrl: string) => {
  const id = getIdFromUrl(avatarUrl);
  const card = cards.get(id);
  return card;
};

export const getCardData = (avatarUrl: string) => {
  return getCardFromUrl(avatarUrl)?.prop.data;
};

/**
 * Card
 */

const generateNewCardId = (): string => {
  return uuidv4();
};

export const createCard = async (propObject: CardPropSerializable) => {
  const prop = CardProp.fromObject(propObject);
  const card = new Card('New', prop);
  cards.set(card.prop._id, card);

  /**
   * Render avatar if current workspace matches
   */
  const workspaceUrl = getCurrentWorkspaceUrl();
  const promises = [];
  for (const loc in card.prop.avatars) {
    if (loc.match(workspaceUrl)) {
      const avatarUrl = loc + card.prop._id;
      const avatar = new Avatar(
        new AvatarProp(avatarUrl, getCardData(avatarUrl), getAvatarProp(avatarUrl))
      );
      avatars.set(avatarUrl, avatar);
      promises.push(avatar.render());
      getCurrentWorkspace()!.avatars.push(avatarUrl);
      promises.push(mainStore.addAvatarUrl(getCurrentWorkspaceId(), avatarUrl));
    }
  }
  await Promise.all(promises).catch(e => {
    console.error(`Error in createCard: ${e.message}`);
  });
  await saveCard(card.prop);
  return prop._id;
};

const saveCard = async (cardProp: CardProp) => {
  await mainStore.updateOrCreateCardData(cardProp).catch((e: Error) => {
    console.error(`Error in saveCard: ${e.message}`);
  });
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
  const card = cards.get(id);
  if (!card) {
    console.error(`Error in deleteCard: card does not exist: ${id}`);
    return;
  }
  /**
   * Delete all avatar cards
   */
  for (const avatarLocation in card.prop.avatars) {
    const avatarUrl = avatarLocation + id;
    // eslint-disable-next-line no-await-in-loop
    await mainStore.deleteAvatarUrl(getWorkspaceIdFromUrl(avatarUrl), avatarUrl); // Use await because there is race case.

    const avatar = avatars.get(avatarUrl);
    const ws = getCurrentWorkspace();
    if (avatar && ws) {
      ws.avatars = ws.avatars.filter(_url => _url !== avatarUrl);
      avatars.delete(avatarUrl);
      avatar.window.destroy();
    }
    else {
      removeAvatarFromWorkspace(getWorkspaceIdFromUrl(avatarUrl), avatarUrl);
    }
  }

  /**
   * Delete actual card
   */
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
};

export class Card {
  public prop!: CardProp;
  public loadOrCreateCardData: () => Promise<void>;
  /**
   * constructor
   * @param cardInitializeType New or Load
   * @param arg CardProp or id
   */
  constructor (public cardInitializeType: CardInitializeType, arg?: CardProp | string) {
    if (cardInitializeType === 'New') {
      this.loadOrCreateCardData = () => {
        return Promise.resolve();
      };
      if (arg === undefined) {
        // Create card with default properties
        this.prop = new CardProp(generateNewCardId());
      }
      else if (arg instanceof CardProp) {
        // Create card with specified CardProp
        if (arg._id === '') {
          arg._id = generateNewCardId();
        }
        this.prop = arg;
      }
      else {
        throw new TypeError('Second parameter must be CardProp when creating new card.');
      }
    }
    else {
      // cardInitializeType === 'Load'
      // Load Card
      if (typeof arg !== 'string') {
        throw new TypeError('Second parameter must be id string when loading the card.');
      }
      const id = arg;

      this.loadOrCreateCardData = async () => {
        this.prop = await mainStore.getCardProp(id).catch((e: Error) => {
          throw e;
        });
      };
    }
  }
}

/**
 * Avatar
 */
export const deleteAvatar = async (_url: string) => {
  const avatar = avatars.get(_url);
  if (avatar) {
    avatars.delete(_url);
    if (!avatar.window.isDestroyed()) {
      avatar.window.destroy();
    }
    await mainStore.deleteAvatarUrl(getCurrentWorkspaceId(), _url);
    const ws = getCurrentWorkspace();
    if (ws) {
      ws.avatars = ws.avatars.filter(avatarUrl => avatarUrl !== _url);
    }
  }
  const card = getCardFromUrl(_url);
  if (!card) {
    return;
  }
  delete card.prop.avatars[getLocationFromUrl(_url)];
  await saveCard(card.prop);
};

export const updateAvatar = async (avatarPropObj: AvatarPropSerializable) => {
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
};

/**
 * Context Menu
 */
const setContextMenu = (prop: AvatarProp, win: BrowserWindow) => {
  const setColor = (name: ColorName) => {
    return {
      label: MESSAGE(name),
      click: () => {
        if (name === 'transparent') {
          win.webContents.send('change-card-color', cardColors[name], 0.0);
        }
        else {
          win.webContents.send('change-card-color', cardColors[name]);
        }
      },
    };
  };

  const moveAvatarToWorkspace = (workspaceId: string) => {
    removeAvatarFromWorkspace(getCurrentWorkspaceId(), prop.url);
    mainStore.deleteAvatarUrl(getCurrentWorkspaceId(), prop.url);
    const newAvatarUrl = getWorkspaceUrl(workspaceId) + getIdFromUrl(prop.url);
    addAvatarToWorkspace(workspaceId, newAvatarUrl);
    mainStore.addAvatarUrl(workspaceId, newAvatarUrl);
    win.webContents.send('card-close');

    const card = getCardFromUrl(prop.url);
    if (card) {
      const avatarProp = card.prop.avatars[getLocationFromUrl(prop.url)];
      delete card.prop.avatars[getLocationFromUrl(prop.url)];
      card.prop.avatars[getLocationFromUrl(newAvatarUrl)] = avatarProp;
      saveCard(card.prop);
    }
  };

  const copyAvatarToWorkspace = (workspaceId: string) => {
    const newAvatarUrl = getWorkspaceUrl(workspaceId) + getIdFromUrl(prop.url);
    if (workspaces.get(workspaceId)?.avatars.includes(newAvatarUrl)) {
      dialog.showMessageBoxSync(settingsDialog, {
        type: 'question',
        buttons: ['OK'],
        message: MESSAGE('workspaceAvatarExist'),
      });
      return;
    }
    addAvatarToWorkspace(workspaceId, newAvatarUrl);
    mainStore.addAvatarUrl(workspaceId, newAvatarUrl);

    const card = getCardFromUrl(prop.url);
    if (card) {
      const avatarProp = card.prop.avatars[getLocationFromUrl(prop.url)];
      card.prop.avatars[getLocationFromUrl(newAvatarUrl)] = avatarProp;
      saveCard(card.prop);
    }
  };

  const moveToWorkspaces: MenuItemConstructorOptions[] = [...workspaces.keys()]
    .sort()
    .reduce((result, id) => {
      if (id !== getCurrentWorkspaceId()) {
        result.push({
          label: `${workspaces.get(id)?.name}`,
          click: () => {
            const workspace = workspaces.get(id);
            if (!workspace) {
              return;
            }
            moveAvatarToWorkspace(id);
          },
        });
      }
      return result;
    }, [] as MenuItemConstructorOptions[]);

  const copyToWorkspaces: MenuItemConstructorOptions[] = [...workspaces.keys()]
    .sort()
    .reduce((result, id) => {
      if (id !== getCurrentWorkspaceId()) {
        result.push({
          label: `${workspaces.get(id)?.name}`,
          click: () => {
            const workspace = workspaces.get(id);
            if (!workspace) {
              return;
            }
            copyAvatarToWorkspace(id);
          },
        });
      }
      return result;
    }, [] as MenuItemConstructorOptions[]);

  const dispose = contextMenu({
    window: win,
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
        label: MESSAGE('workspaceMove'),
        submenu: [...moveToWorkspaces],
      },
      {
        label: MESSAGE('workspaceCopy'),
        submenu: [...copyToWorkspaces],
      },
      {
        label: MESSAGE('zoomIn'),
        click: () => {
          win.webContents.send('zoom-in');
        },
      },
      {
        label: MESSAGE('zoomOut'),
        click: () => {
          win.webContents.send('zoom-out');
        },
      },
      {
        label: MESSAGE('sendToBack'),
        click: () => {
          win.webContents.send('send-to-back');
        },
      },
      {
        label: prop.condition.locked ? MESSAGE('unlockCard') : MESSAGE('lockCard'),
        click: () => {
          prop.condition.locked = !prop.condition.locked;
          win.webContents.send('set-lock', prop.condition.locked);
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
    setContextMenu(prop, win);
  };

  return resetContextMenu;
};

class Avatar {
  public prop: AvatarProp;
  public window: BrowserWindow;
  public indexUrl: string;

  public suppressFocusEventOnce = false;
  public suppressBlurEventOnce = false;
  public recaptureGlobalFocusEventAfterLocalFocusEvent = false;

  public renderingCompleted = false;

  public resetContextMenu: () => void;

  constructor (_prop: AvatarProp) {
    this.prop = _prop;
    this.indexUrl = url.format({
      pathname: path.join(__dirname, '../index.html'),
      protocol: 'file:',
      slashes: true,
      query: {
        avatarUrl: this.prop.url,
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

      icon: path.join(__dirname, '../assets/media_stickies_grad_icon.ico'),
    });
    this.window.setMaxListeners(20);

    // this.window.webContents.openDevTools();

    this.window.on('closed', this._closedListener);

    this.resetContextMenu = setContextMenu(this.prop, this.window);

    // Open hyperlink on external browser window
    // by preventing to open it on new electron window
    // when target='_blank' is set.
    this.window.webContents.on('new-window', (e, _url) => {
      e.preventDefault();
      shell.openExternal(_url);
    });

    this.window.webContents.on('did-finish-load', () => {
      const checkNavigation = (_event: Electron.Event, navUrl: string) => {
        //        console.debug('did-start-navigate : ' + navUrl);
        // Check top frame
        const topFrameURL = this.indexUrl.replace(/\\/g, '/');
        if (navUrl === topFrameURL) {
          // Top frame is reloaded
          this.window.webContents.off('did-start-navigation', checkNavigation);
          console.debug('Top frame is reloaded.');
          return true;
        }

        // Check iframe
        const iframeRex = new RegExp(
          topFrameURL.replace(/index.html\?.+$/, 'iframe/contents_frame.html$')
        );
        const isValid = iframeRex.test(navUrl);
        if (navUrl === 'about:blank') {
          // skip
        }
        else if (isValid) {
          // console.debug(`Block navigation to valid url: ${url}`);
          // When iframe is reloaded, cardWindow must be also reloaded not to apply tampered sandbox attributes to iframe.
          console.error(`Block navigation to valid url: ${navUrl}`);
          this.window.webContents.off('did-start-navigation', checkNavigation);

          // Same origin policy between top frame and iframe is failed after reload(). (Cause unknown)
          // Create and destroy card for workaround.
          // this.window.webContents.send('reload');
          const avatar = new Avatar(this.prop);
          const prevWin = this.window;
          avatars.get(this.prop.url);
          avatar
            .render()
            .then(() => {
              prevWin.destroy();
              avatars.set(this.prop.url, avatar);
            })
            .catch(() => {});
        }
        else {
          console.error(`Block navigation to invalid url: ${navUrl}`);
          this.window.webContents.off('did-start-navigation', checkNavigation);
          /**
           * 1. Call window.api.finishRenderCard(cardProp.id) to tell initialize process the error
           * 2. Show alert dialog
           * 3. Remove malicious card
           */
          this.renderingCompleted = true;

          let domainMatch = navUrl.match(/https?:\/\/([^/]+?)\//);
          if (!domainMatch) {
            domainMatch = navUrl.match(/https?:\/\/([^/]+?)$/);
          }

          if (!domainMatch) {
            // not http, https

            // Don't use BrowserWindow option because it invokes focus event on the indicated BrowserWindow
            // (and the focus event causes saving data.)
            dialog.showMessageBoxSync({
              type: 'question',
              buttons: ['OK'],
              message: MESSAGE('securityLocalNavigationError', navUrl),
            });
            // Destroy
            const id = getIdFromUrl(this.prop.url);
            deleteCardWithRetry(id);
            // return;
          }
          /*
          const domain = domainMatch[1];
          if (getSettings().persistent.navigationAllowedURLs.includes(domain)) {
            console.debug(`Navigation to ${navUrl} is allowed.`);
            return;
          }
          // Don't use BrowserWindow option because it invokes focus event on the indicated BrowserWindow
          // (and the focus event causes saving data.)
          const res = dialog.showMessageBoxSync({
            type: 'question',
            buttons: [MESSAGE('btnAllow'), MESSAGE('btnCancel')],
            defaultId: DIALOG_BUTTON.default,
            cancelId: DIALOG_BUTTON.cancel,
            message: MESSAGE('securityPageNavigationAlert', navUrl),
          });
          if (res === DIALOG_BUTTON.default) {
            // Reload if permitted
            console.debug(`Allow ${domain}`);
            globalDispatch({
              type: 'navigationAllowedURLs-put',
              payload: domain,
            });
            this.window.webContents.reload();
          }
          else if (res === DIALOG_BUTTON.cancel) {
            // Destroy if not permitted
            console.debug(`Deny ${domain}`);
            const id = getIdFromUrl(this.prop.url);
            deleteCardWithRetry(id);
          }
          */
        }
      };
      //      console.debug('did-finish-load: ' + this.window.webContents.getURL());
      this.window.webContents.on('did-start-navigation', checkNavigation);
    });

    this.window.webContents.on('will-navigate', (event, navUrl) => {
      // block page transition
      const prevUrl = this.indexUrl.replace(/\\/g, '/');
      if (navUrl === prevUrl) {
        // console.debug('reload() in top frame is permitted');
      }
      else {
        console.error('Page navigation in top frame is not permitted.');
        event.preventDefault();
      }
    });
  }

  private _closedListener = () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    const avatar = avatars.get(this.prop.url);
    if (avatar) {
      avatar.removeWindowListeners();
    }
    avatars.delete(this.prop.url);
    // Emit window-all-closed event explicitly
    // because Electron sometimes does not emit it automatically.
    if (avatars.size === 0) {
      app.emit('window-all-closed');
    }
  };

  public removeWindowListeners = () => {
    this.window.off('closed', this._closedListener);
  };

  public render = async () => {
    await this._loadHTML().catch(e => {
      throw new Error(`Error in render(): ${e.message}`);
    });
    await this.renderCard(this.prop).catch(e => {
      throw new Error(`Error in _renderCard(): ${e.message}`);
    });
  };

  renderCard = (_prop: AvatarProp): Promise<void> => {
    return new Promise(resolve => {
      this.window.setSize(_prop.geometry.width, _prop.geometry.height);
      this.window.setPosition(_prop.geometry.x, _prop.geometry.y);
      console.debug(`renderCard in main [${_prop.url}] ${_prop.data.substr(0, 40)}`);
      this.window.showInactive();
      this.window.webContents.send('render-card', _prop.toObject()); // CardProp must be serialize because passing non-JavaScript objects to IPC methods is deprecated and will throw an exception beginning with Electron 9.
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
        console.debug('loadHTML  ' + this.prop.url);
        const finishReloadListener = () => {
          console.debug('Reloaded: ' + this.prop.url);
          this.window.webContents.send('render-card', this.prop.toObject());
        };

        // Don't use 'did-finish-load' event.
        // loadHTML resolves after loading HTML and processing required script are finished.
        //     this.window.webContents.on('did-finish-load', () => {
        const handler = 'finish-load-' + encodeURIComponent(this.prop.url);
        handlers.push(handler);
        ipcMain.handle(handler, finishReloadListener);
        resolve();
      };
      ipcMain.handleOnce(
        'finish-load-' + encodeURIComponent(this.prop.url),
        finishLoadListener
      );

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
