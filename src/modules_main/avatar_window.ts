/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import nodeUrl from 'url';
import path from 'path';

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  MenuItemConstructorOptions,
  shell,
} from 'electron';
import contextMenu from 'electron-context-menu';
import { DebounceQueue } from 'rx-queue';
import { DIALOG_BUTTON } from '../modules_common/const';

import { getIdFromUrl } from '../modules_common/avatar_url_utils';
import { handlers } from './event';
import { cardColors, ColorName } from '../modules_common/color';
import { getCurrentWorkspaceId, workspaces } from './store_workspaces';
import { Avatar } from '../modules_common/schema_avatar';
import { AvatarUrl } from '../modules_common/schema_workspace';
import {
  avatarPositionUpdateActionCreator,
  avatarSizeUpdateActionCreator,
} from '../modules_common/actions';
import { MESSAGE } from './store';

/**
 * Const
 */
const MINIMUM_WINDOW_WIDTH = 185; // 180 + shadowWidth
const MINIMUM_WINDOW_HEIGHT = 80;

export const avatarWindows: Map<AvatarUrl, AvatarWindow> = new Map<
  AvatarUrl,
  AvatarWindow
>();

/**
 * Focus control
 */
let globalFocusListenerPermission = true;
let zIndexOfTopAvatar: number;
export const setZIndexOfTopAvatar = (value: number) => {
  zIndexOfTopAvatar = value;
};
export const getZIndexOfTopAvatar = () => {
  return zIndexOfTopAvatar;
};
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

// TODO:
const saveCard = () => {};

export const createAvatarWindows = async (avatars: Avatar[]) => {
  const renderers: Promise<void>[] = [];
  avatars.forEach(avatar => {
    const avatarWindow = new AvatarWindow(avatar.url);
    avatarWindows.set(avatar.url, avatarWindow);
    renderers.push(avatarWindow.render(avatar));
  });
  await Promise.all(renderers).catch(e => {
    console.error(`Error while rendering cards in ready event: ${e.message}`);
  });
};

/**
 * Context Menu
 */
const setContextMenu = (win: BrowserWindow) => {
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
    /**
     * TODO:

    removeAvatarFromWorkspace(getCurrentWorkspaceId(), prop.url);
    deleteAvatarUrl(getCurrentWorkspaceId(), prop.url);
    const newAvatarUrl = getWorkspaceUrl(workspaceId) + getIdFromUrl(prop.url);
    addAvatarToWorkspace(workspaceId, newAvatarUrl);
    addAvatarUrl(workspaceId, newAvatarUrl);
    win.webContents.send('card-close');

    const card = getCardFromUrl(prop.url);
    if (card) {
      const avatarProp = card.prop.avatars[getLocationFromUrl(prop.url)];
      delete card.prop.avatars[getLocationFromUrl(prop.url)];
      card.prop.avatars[getLocationFromUrl(newAvatarUrl)] = avatarProp;
      // TODO: saveCard(card.prop);
      saveCard();
    }
    */
  };

  const copyAvatarToWorkspace = (workspaceId: string) => {
    /**
     * TODO:
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
    addAvatarUrl(workspaceId, newAvatarUrl);

    const card = getCardFromUrl(prop.url);
    if (card) {
      const avatarProp = card.prop.avatars[getLocationFromUrl(prop.url)];
      card.prop.avatars[getLocationFromUrl(newAvatarUrl)] = avatarProp;
      // TODO: saveCard(card.prop);
      saveCard();
    }
    */
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
        /** TODO:
        label: prop.condition.locked ? MESSAGE('unlockCard') : MESSAGE('lockCard'),
        click: () => {
          prop.condition.locked = !prop.condition.locked;
          win.webContents.send('set-lock', prop.condition.locked);
          resetContextMenu();
        },
         */
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
    setContextMenu(win);
  };

  return resetContextMenu;
};

export class AvatarWindow {
  public url: string;
  public window: BrowserWindow;
  public indexUrl: string;

  public suppressFocusEventOnce = false;
  public suppressBlurEventOnce = false;
  public recaptureGlobalFocusEventAfterLocalFocusEvent = false;

  public renderingCompleted = false;

  public resetContextMenu: () => void;

  private _debouncedAvatarPositionUpdateActionQueue = new DebounceQueue(1000);
  private _debouncedAvatarSizeUpdateActionQueue = new DebounceQueue(1000);

  constructor (_url: string) {
    this.url = _url;
    this.indexUrl = nodeUrl.format({
      pathname: path.join(__dirname, '../index.html'),
      protocol: 'file:',
      slashes: true,
      query: {
        avatarUrl: this.url,
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

    this.window.webContents.openDevTools();

    // Resized by hand
    // will-resize is only emitted when the window is being resized manually.
    // Resizing the window with setBounds/setSize will not emit this event.
    // Though window.onresize event can be invoked in Renderer Process,
    // listen it only in Main Process to keep in step with onmove event.
    this.window.on('will-resize', this._willResizeListener);

    // Moved by hand
    // window.onmove event cannot be invoked in Renderer Process.
    this.window.on('will-move', this._willMoveListener);

    this.window.on('closed', this._closedListener);

    // Though window.onfocus event can be invoked in Renderer Process,
    // it has a bug. After startup, the first event is not invoked in Render Process.
    // So, listen it in Main Process.
    this.window.on('focus', this._focusListener);
    this.window.on('blur', this._blurListener);

    this.resetContextMenu = setContextMenu(this.window);

    // Open hyperlink on external browser window
    // by preventing to open it on new electron window
    // when target='_blank' is set.
    this.window.webContents.on('new-window', (e, href) => {
      e.preventDefault();
      shell.openExternal(href);
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
          const avatar = this;
          const prevWin = this.window;

          /**
           * TODO:

          avatars.get(this.prop.url);
          avatar
            .render()
            .then(() => {
              prevWin.destroy();
              avatars.set(this.prop.url, avatar);
            })
            .catch(() => {});
           */
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
            const id = getIdFromUrl(this.url);
            /**
             * TODO:
            deleteCardWithRetry(id);
             */
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
            const id = getIdFromUrl(this.url);
            //
            // TODO:
            // deleteCardWithRetry(id);
            //
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

    this._debouncedAvatarPositionUpdateActionQueue.subscribe(rect => {
      const action = avatarPositionUpdateActionCreator(this.url, rect, true);
      //      persistentStoreActionDispatcher(action);
    });
    this._debouncedAvatarSizeUpdateActionQueue.subscribe(rect => {
      const action = avatarSizeUpdateActionCreator(this.url, rect, true);
      //      persistentStoreActionDispatcher(action);
    });
  }

  // Forward changes on persistent store to Renderer process
  public reactiveForwarder = (props: { propertyName?: keyof Avatar; state: any }) => {
    console.debug(`Forward: ${props.propertyName || 'all properties'} to ${this.url}`);
    this.window.webContents.send('reactive-forward', props.propertyName, props.state);
  };

  private _willMoveListener = (event: Electron.Event, rect: Electron.Rectangle) => {
    // Update x and y
    this._debouncedAvatarPositionUpdateActionQueue.next(rect);
    this.reactiveForwarder({ propertyName: 'geometry', state: rect });
  };

  private _willResizeListener = (event: Electron.Event, rect: Electron.Rectangle) => {
    // Update x, y, width, height
    this._debouncedAvatarSizeUpdateActionQueue.next(rect);
    this.reactiveForwarder({ propertyName: 'geometry', state: rect });
  };

  private _closedListener = () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    this.removeWindowListeners();

    avatarWindows.delete(this.url);
    // Emit window-all-closed event explicitly
    // because Electron sometimes does not emit it automatically.
    if (avatarWindows.size === 0) {
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

  public removeWindowListeners = () => {
    this.removeWindowListenersExceptClosedEvent();
    this.window.off('closed', this._closedListener);
  };

  public removeWindowListenersExceptClosedEvent = () => {
    this.window.off('will-resize', this._willResizeListener);
    this.window.off('will-move', this._willMoveListener);
    this.window.off('focus', this._focusListener);
    this.window.off('blur', this._blurListener);
  };

  public render = async (avatar: Avatar) => {
    await this._loadHTML(avatar).catch(e => {
      throw new Error(`Error in render(): ${e.message}`);
    });
    console.debug('Start renderCard()' + avatar.url);
    await this.renderCard(avatar).catch(e => {
      throw new Error(`Error in _renderCard(): ${e.message}`);
    });
  };

  renderCard = (avatar: Avatar): Promise<void> => {
    return new Promise(resolve => {
      console.debug('setSize' + avatar.url);
      console.dir(avatar, { depth: null });
      this.window.setSize(avatar.geometry.width, avatar.geometry.height);
      console.debug('setPosition ' + avatar.url);
      this.window.setPosition(avatar.geometry.x, avatar.geometry.y);
      this.window.showInactive();

      console.debug('render-card ' + avatar.url);
      this.window.webContents.send('render-card', avatar); // CardProp must be serialize because passing non-JavaScript objects to IPC methods is deprecated and will throw an exception beginning with Electron 9.
      const checkTimer = setInterval(() => {
        if (this.renderingCompleted) {
          clearInterval(checkTimer);
          resolve();
        }
      }, 200);
    });
  };

  private _loadHTML: (avatar: Avatar) => Promise<void> = (avatar: Avatar) => {
    return new Promise((resolve, reject) => {
      const finishLoadListener = (event: Electron.IpcMainInvokeEvent) => {
        console.debug('loadHTML  ' + this.url);
        const finishReloadListener = () => {
          console.debug('Reloaded: ' + this.url);
          this.window.webContents.send('render-card', avatar);
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
