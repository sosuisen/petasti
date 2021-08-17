/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { v4 as uuidv4 } from 'uuid';
import { app, BrowserWindow, dialog, ipcMain, MouseInputEvent } from 'electron';
import { DIALOG_BUTTON } from './modules_common/const';
import { MessageLabel } from './modules_common/i18n';
import {
  Card,
  createCard,
  currentCardMap,
  deleteAvatar,
  deleteCardWithRetry,
  setGlobalFocusEventListenerPermission,
  updateAvatar,
} from './modules_main/card';
import { destroyTray, initializeTaskTray, setTrayContextMenu } from './modules_main/tray';
import { openSettings, settingsDialog } from './modules_main/settings';
import { emitter, handlers } from './modules_main/event';
import { getIdFromUrl } from './modules_common/avatar_url_utils';
import { mainStore, MESSAGE } from './modules_main/store';
import { avatarDepthUpdateActionCreator } from './modules_common/actions';
import { CardProp } from './modules_common/types';

// process.on('unhandledRejection', console.dir);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-line global-require
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Increase max listeners
ipcMain.setMaxListeners(1000);


let zIndexOfTopAvatar: number;
export const setZIndexOfTopAvatar = (value: number) => {
  zIndexOfTopAvatar = value;
};
export const getZIndexOfTopAvatar = () => {
  return zIndexOfTopAvatar;
};

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.on('ready', async () => {
  // load workspaces
  const cardProps = await mainStore.loadNotebook();

  const renderers: Promise<void>[] = [];  
  cardProps.forEach(cardProp => {
    const card = new Card(cardProp);
    currentCardMap[cardProp.url] = card;
    renderers.push(card.render());
  });
  await Promise.all(renderers).catch(e => {
    console.error(`Error while rendering cards in ready event: ${e.message}`);
  });


  // for debug
  if (!app.isPackaged && process.env.NODE_ENV === 'development') {
    openSettings();
  }

  const backToFront = Object.values(currentCardMap).sort((a, b) => {
    if (a.geometry.z < b.geometry.z) {
      return -1;
    }
    else if (a.geometry.z > b.geometry.z) {
      return 1;
    }
    return 0;
  });

  let zIndexOfTopAvatar = 0;
  backToFront.forEach(card => {
    if (card.window && !card.window.isDestroyed()) {
      card.window.moveTop();
      zIndexOfTopAvatar = card.geometry.z;
    }
  });
  setZIndexOfTopAvatar(zIndexOfTopAvatar);

  const size = backToFront.length;
  console.debug(`Completed to load ${size} cards`);

  /*
  if (size === 0) {
    addNewAvatar();
    console.debug(`Added initial card`);
  }
  */
  /**
   * Add task tray
   **/
  initializeTaskTray();
});

/**
 * Exit app
 */
emitter.on('exit', () => {
  mainStore.closeDB();
  destroyTray();
  app.quit();
});

emitter.on('change-workspace', (nextNoteId: string) => {
  handlers.forEach(channel => ipcMain.removeHandler(channel));
  handlers.length = 0; // empty
  currentCardMap.clear();
  mainStore.settings.currentNoteId = nextNoteId;
  setTrayContextMenu();
  mainStore.updateWorkspaceStatus();
  mainStore.loadCurrentNote();
});

app.on('window-all-closed', () => {
  if (mainStore.changingToNoteId === 'exit') {
    emitter.emit('exit');
  }
  else if (mainStore.changingToNoteId !== 'none') {
    emitter.emit('change-workspace', mainStore.changingToNoteId);
  }
  mainStore.changingToNoteId = 'none';
});

/**
 * ipcMain handles
 */

ipcMain.handle('update-avatar', async (event, cardProp: CardProp) => {
  await updateAvatar(cardProp);
});

ipcMain.handle('delete-avatar', async (event, url: string) => {
  await deleteAvatar(url);
});

ipcMain.handle('delete-card', async (event, url: string) => {
  await deleteCardWithRetry(getIdFromUrl(url));
});

ipcMain.handle('finish-render-card', (event, url: string) => {
  const card = currentCardMap.get(url);
  if (card) {
    card.renderingCompleted = true;
  }
});

ipcMain.handle('create-card', async (event, cardProp: CardProp) => {
  const id = await createCard(cardProp);
  return id;
});

ipcMain.handle('blur-and-focus-with-suppress-events', (event, url: string) => {
  const card = currentCardMap.get(url);
  if (card) {
    console.debug(`blurAndFocus: ${url}`);
    /**
     * When a card is blurred, another card will be focused automatically by OS.
     * Set suppressGlobalFocusEvent to suppress to focus another card.
     */
    setGlobalFocusEventListenerPermission(false);
    card.suppressBlurEventOnce = true;
    card.window.blur();
    card.suppressFocusEventOnce = true;
    card.recaptureGlobalFocusEventAfterLocalFocusEvent = true;
    card.window.focus();
  }
});

ipcMain.handle('blur-and-focus-with-suppress-focus-event', (event, url: string) => {
  const card = currentCardMap.get(url);
  if (card) {
    console.debug(`blurAndFocus: ${url}`);
    /**
     * When a card is blurred, another card will be focused automatically by OS.
     * Set suppressGlobalFocusEvent to suppress to focus another card.
     */
    setGlobalFocusEventListenerPermission(false);
    card.window.blur();
    card.recaptureGlobalFocusEventAfterLocalFocusEvent = true;
    card.window.focus();
  }
});

ipcMain.handle('blur', (event, url: string) => {
  const card = currentCardMap.get(url);
  if (card) {
    console.debug(`blur: ${url}`);
    card.window.blur();
  }
});

ipcMain.handle('focus', (event, url: string) => {
  const card = currentCardMap.get(url);
  if (card) {
    console.debug(`focus: ${url}`);
    card.window.focus();
  }
});

ipcMain.handle('set-title', (event, url: string, title: string) => {
  const card = currentCardMap.get(url);
  if (card) {
    card.window.setTitle(title);
  }
});

ipcMain.handle('alert-dialog', (event, url: string, label: MessageLabel) => {
  let win: BrowserWindow;
  if (url === 'settingsDialog') {
    win = settingsDialog;
  }
  else {
    const card = currentCardMap.get(url);
    if (!card) {
      return;
    }
    win = card.window;
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
      const card = currentCardMap.get(url);
      if (!card) {
        return;
      }
      win = card.window;
    }

    const buttons: string[] = buttonLabels.map(buttonLabel => MESSAGE(buttonLabel));
    return dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: buttons,
      defaultId: DIALOG_BUTTON.default,
      cancelId: DIALOG_BUTTON.cancel,
      message: MESSAGE(label),
    });
  }
);

ipcMain.handle('set-window-size', (event, url: string, width: number, height: number) => {
  const card = currentCardMap.get(url);
  // eslint-disable-next-line no-unused-expressions
  card?.window.setSize(width, height);
  return card?.window.getBounds();
});

ipcMain.handle('set-window-position', (event, url: string, x: number, y: number) => {
  const card = currentCardMap.get(url);
  // eslint-disable-next-line no-unused-expressions
  card?.window.setPosition(x, y);
  return card?.window.getBounds();
});

ipcMain.handle('get-uuid', () => {
  return uuidv4();
});

ipcMain.handle('bring-to-front', (event, url: string, rearrange = false) => {
  // Database Update
  const zIndexOfTopAvatar = getZIndexOfTopAvatar() + 1;
  console.debug(`new zIndex: ${zIndexOfTopAvatar}`);
  const action = avatarDepthUpdateActionCreator(url, zIndexOfTopAvatar, false);

  //  persistentStoreActionDispatcher(action);

  // persistentStoreActionDispatcher works synchronously,
  // so DB has been already updated here.
  setZIndexOfTopAvatar(zIndexOfTopAvatar);

  // NOTE: When bring-to-front is invoked by focus event, the card has been already brought to front.
  if (rearrange) {
    const backToFront = Object.values(currentCardMap).sort((a, b) => {
      if (a.geometry.z < b.geometry.z) {
        return -1;
      }
      else if (a.geometry.z > b.geometry.z) {
        return 1;
      }
      return 0;
    });

    backToFront.forEach(card => {
      console.debug(`sorting zIndex..: ${card.geometry.z}`);
      
      if (card.window && !card.window.isDestroyed()) {
        card.window.moveTop();
      }
    });
  }
});

ipcMain.handle('send-to-back', (event, url: string) => {
  const backToFront = Object.values(currentCardMap).sort((a, b) => {
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

  // persistentStoreActionDispatcher(action);

  // persistentStoreActionDispatcher works synchronously,
  // so DB has been already updated here.

  backToFront.forEach(card => {
    console.debug(`sorting zIndex..: ${card.geometry.z}`);
    const avatarWin = currentCardMap.get(card.url);
    if (avatarWin && !avatarWin.window.isDestroyed()) {
      avatarWin!.suppressFocusEventOnce = true;
      avatarWin!.window.focus();
    }
  });
});

ipcMain.handle(
  'send-mouse-input',
  (event, url: string, mouseInputEvent: MouseInputEvent) => {
    const cardWindow = currentCardMap.get(url);
    if (!cardWindow) {
      return;
    }
    cardWindow.window.webContents.sendInputEvent(mouseInputEvent);
  }
);
