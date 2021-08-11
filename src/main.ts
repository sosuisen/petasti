/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { v4 as uuidv4 } from 'uuid';
import { app, BrowserWindow, dialog, ipcMain, MouseInputEvent } from 'electron';
import { DialogButton } from './modules_common/const';
import { AvatarPropSerializable, CardPropSerializable } from './modules_common/cardprop';
import { availableLanguages, defaultLanguage, MessageLabel } from './modules_common/i18n';
import {
  createCard,
  deleteAvatar,
  deleteCardWithRetry,
  setGlobalFocusEventListenerPermission,
  updateAvatar,
} from './modules_main/card';
import { MESSAGE } from './modules_main/store_settings';
import { destroyTray, initializeTaskTray, setTrayContextMenu } from './modules_main/tray';
import { openSettings, settingsDialog } from './modules_main/settings';
import {
  getChangingToWorkspaceId,
  setChangingToWorkspaceId,
  setCurrentWorkspaceId,
} from './modules_main/store_workspaces';
import { emitter, handlers } from './modules_main/event';
import { getIdFromUrl } from './modules_common/avatar_url_utils';
import {
  closeDB,
  currentAvatarMap,
  loadCurrentAvatars,
  loadCurrentNote,
  openDB,
  prepareDbSync,
  updateWorkspaceStatus,
} from './modules_main/store';
import {
  avatarWindows,
  getZIndexOfTopAvatar,
  setZIndexOfTopAvatar,
} from './modules_main/avatar_window';
import { avatarDepthUpdateActionCreator } from './modules_common/actions';
import { persistentStoreActionDispatcher } from './modules_main/store_utils';
import { Avatar } from './modules_common/schema_avatar';

// process.on('unhandledRejection', console.dir);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-line global-require
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Increase max listeners
ipcMain.setMaxListeners(1000);

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.on('ready', async () => {
  // locale can be got after 'ready'
  const myLocale = app.getLocale();
  console.debug(`locale: ${myLocale}`);
  let preferredLanguage: string = defaultLanguage;
  if (availableLanguages.includes(myLocale)) {
    preferredLanguage = myLocale;
  }

  // for debug
  if (!app.isPackaged && process.env.NODE_ENV === 'development') {
    openSettings();
  }

  // load workspaces
  await openDB();

  await loadCurrentNote();

  prepareDbSync();

  /**
   * Add task tray
   **/
  initializeTaskTray();
});

/**
 * Exit app
 */
emitter.on('exit', () => {
  closeDB();
  destroyTray();
  app.quit();
});

emitter.on('change-workspace', (nextWorkspaceId: string) => {
  handlers.forEach(channel => ipcMain.removeHandler(channel));
  handlers.length = 0; // empty
  avatarWindows.clear();
  setCurrentWorkspaceId(nextWorkspaceId);
  setTrayContextMenu();
  updateWorkspaceStatus();
  loadCurrentNote();
});

app.on('window-all-closed', () => {
  const nextWorkspaceId = getChangingToWorkspaceId();
  if (nextWorkspaceId === 'exit') {
    emitter.emit('exit');
  }
  else if (nextWorkspaceId !== 'none') {
    emitter.emit('change-workspace', nextWorkspaceId);
  }
  setChangingToWorkspaceId('none');
});

/**
 * ipcMain handles
 */

ipcMain.handle('update-avatar', async (event, avatarPropObj: AvatarPropSerializable) => {
  await updateAvatar(avatarPropObj);
});

ipcMain.handle('delete-avatar', async (event, url: string) => {
  await deleteAvatar(url);
});

ipcMain.handle('delete-card', async (event, url: string) => {
  await deleteCardWithRetry(getIdFromUrl(url));
});

ipcMain.handle('finish-render-card', (event, url: string) => {
  const avatarWindow = avatarWindows.get(url);
  if (avatarWindow) {
    avatarWindow.renderingCompleted = true;
  }
});

ipcMain.handle('create-card', async (event, propObject: CardPropSerializable) => {
  const id = await createCard(propObject);
  return id;
});

ipcMain.handle('blur-and-focus-with-suppress-events', (event, url: string) => {
  const avatarWindow = avatarWindows.get(url);
  if (avatarWindow) {
    console.debug(`blurAndFocus: ${url}`);
    /**
     * When a card is blurred, another card will be focused automatically by OS.
     * Set suppressGlobalFocusEvent to suppress to focus another card.
     */
    setGlobalFocusEventListenerPermission(false);
    avatarWindow.suppressBlurEventOnce = true;
    avatarWindow.window.blur();
    avatarWindow.suppressFocusEventOnce = true;
    avatarWindow.recaptureGlobalFocusEventAfterLocalFocusEvent = true;
    avatarWindow.window.focus();
  }
});

ipcMain.handle('blur-and-focus-with-suppress-focus-event', (event, url: string) => {
  const avatarWindow = avatarWindows.get(url);
  if (avatarWindow) {
    console.debug(`blurAndFocus: ${url}`);
    /**
     * When a card is blurred, another card will be focused automatically by OS.
     * Set suppressGlobalFocusEvent to suppress to focus another card.
     */
    setGlobalFocusEventListenerPermission(false);
    avatarWindow.window.blur();
    avatarWindow.recaptureGlobalFocusEventAfterLocalFocusEvent = true;
    avatarWindow.window.focus();
  }
});

ipcMain.handle('blur', (event, url: string) => {
  const avatarWindow = avatarWindows.get(url);
  if (avatarWindow) {
    console.debug(`blur: ${url}`);
    avatarWindow.window.blur();
  }
});

ipcMain.handle('focus', (event, url: string) => {
  const avatarWindow = avatarWindows.get(url);
  if (avatarWindow) {
    console.debug(`focus: ${url}`);
    avatarWindow.window.focus();
  }
});

ipcMain.handle('set-title', (event, url: string, title: string) => {
  const avatarWindow = avatarWindows.get(url);
  if (avatarWindow) {
    avatarWindow.window.setTitle(title);
  }
});

ipcMain.handle('alert-dialog', (event, url: string, label: MessageLabel) => {
  let win: BrowserWindow;
  if (url === 'settingsDialog') {
    win = settingsDialog;
  }
  else {
    const avatarWindow = avatarWindows.get(url);
    if (!avatarWindow) {
      return;
    }
    win = avatarWindow.window;
  }

  dialog.showMessageBoxSync(win, {
    type: 'question',
    buttons: ['OK'],
    message: MESSAGE(label),
  });
});

ipcMain.handle(
  'confirm-dialog',
  (event, url: string, buttonLabels: MessageLabel[], label: MessageLabel) => {
    let win: BrowserWindow;
    if (url === 'settingsDialog') {
      win = settingsDialog;
    }
    else {
      const avatarWindow = avatarWindows.get(url);
      if (!avatarWindow) {
        return;
      }
      win = avatarWindow.window;
    }

    const buttons: string[] = buttonLabels.map(buttonLabel => MESSAGE(buttonLabel));
    return dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: buttons,
      defaultId: DialogButton.Default,
      cancelId: DialogButton.Cancel,
      message: MESSAGE(label),
    });
  }
);

ipcMain.handle('set-window-size', (event, url: string, width: number, height: number) => {
  const avatarWindow = avatarWindows.get(url);
  // eslint-disable-next-line no-unused-expressions
  avatarWindow?.window.setSize(width, height);
  return avatarWindow?.window.getBounds();
});

ipcMain.handle('set-window-position', (event, url: string, x: number, y: number) => {
  const avatarWindow = avatarWindows.get(url);
  // eslint-disable-next-line no-unused-expressions
  avatarWindow?.window.setPosition(x, y);
  return avatarWindow?.window.getBounds();
});

ipcMain.handle('get-uuid', () => {
  return uuidv4();
});

ipcMain.handle('bring-to-front', async (event, url: string, rearrange = false) => {
  // Database Update
  const zIndexOfTopAvatar = getZIndexOfTopAvatar() + 1;
  console.debug(`new zIndex: ${zIndexOfTopAvatar}`);
  const action = avatarDepthUpdateActionCreator(url, zIndexOfTopAvatar, false);
  persistentStoreActionDispatcher(action);
  // persistentStoreActionDispatcher works synchronously,
  // so DB has been already updated here.
  setZIndexOfTopAvatar(zIndexOfTopAvatar);

  // NOTE: When bring-to-front is invoked by focus event, the card has been already brought to front.
  if (rearrange) {
    await loadCurrentAvatars();

    const backToFront = Object.values(currentAvatarMap).sort((a, b) => {
      if (a.geometry.z < b.geometry.z) {
        return -1;
      }
      else if (a.geometry.z > b.geometry.z) {
        return 1;
      }
      return 0;
    });

    backToFront.forEach(avatar => {
      console.debug(`sorting zIndex..: ${avatar.geometry.z}`);
      const avatarWin = avatarWindows.get(avatar.url);
      if (avatarWin && !avatarWin.window.isDestroyed()) {
        avatarWin.window.moveTop();
      }
    });
  }
});

ipcMain.handle('send-to-back', async (event, url: string) => {
  await loadCurrentAvatars();

  const backToFront = Object.values(currentAvatarMap).sort((a, b) => {
    if (a.geometry.z < b.geometry.z) {
      return -1;
    }
    else if (a.geometry.z > b.geometry.z) {
      return 1;
    }
    return 0;
  });

  // Database Update
  const zIndexOfBottomAvatar = backToFront[0].geometry.z - 1;
  console.debug(`new zIndex: ${zIndexOfBottomAvatar}`);
  const action = avatarDepthUpdateActionCreator(url, zIndexOfBottomAvatar, false);
  persistentStoreActionDispatcher(action);
  // persistentStoreActionDispatcher works synchronously,
  // so DB has been already updated here.

  backToFront.forEach(avatar => {
    console.debug(`sorting zIndex..: ${avatar.geometry.z}`);
    const avatarWin = avatarWindows.get(avatar.url);
    if (avatarWin && !avatarWin.window.isDestroyed()) {
      avatarWin!.suppressFocusEventOnce = true;
      avatarWin!.window.focus();
    }
  });
});

ipcMain.handle(
  'send-mouse-input',
  (event, url: string, mouseInputEvent: MouseInputEvent) => {
    const avatarWindow = avatarWindows.get(url);
    if (!avatarWindow) {
      return;
    }
    avatarWindow.window.webContents.sendInputEvent(mouseInputEvent);
  }
);
