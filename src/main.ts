/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { app, ipcMain, MouseInputEvent } from 'electron';
import { APP_SCHEME } from './modules_common/const';
import { Card, setGlobalFocusEventListenerPermission } from './modules_main/card';
import { destroyTray, initializeTaskTray, setTrayContextMenu } from './modules_main/tray';
import { emitter, handlers } from './modules_main/event';
import { note } from './modules_main/note';
import { CardProp, SavingTarget } from './modules_common/types';
import { generateNewCardId, getCardIdFromUrl } from './modules_common/utils';
import { addSettingsHandler } from './modules_main/settings_eventhandler';
import { currentCardMap } from './modules_main/card_map';
import {
  getZIndexOfTopCard,
  setZIndexOfBottomCard,
  setZIndexOfTopCard,
} from './modules_main/card_zindex';
import { createCard } from './modules_main/card_create';

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
  // load workspaces
  const cardProps = await note.loadNotebook();

  const renderers: Promise<void>[] = [];
  cardProps.forEach(cardProp => {
    const card = new Card(note, cardProp);
    currentCardMap.set(cardProp.url, card);
    renderers.push(card.render());
  });
  await Promise.all(renderers).catch(e => {
    console.error(`Error while rendering cards in ready event: ${e.message}`);
  });

  const backToFront = [...currentCardMap.values()].sort((a, b) => {
    if (a.geometry.z > b.geometry.z) return 1;
    else if (a.geometry.z < b.geometry.z) return -1;
    return 0;
  });
  if (currentCardMap.size > 0) {
    setZIndexOfTopCard(backToFront[backToFront.length - 1].geometry.z);
    setZIndexOfBottomCard(backToFront[0].geometry.z);
  }
  backToFront.forEach(card => {
    if (card.window && !card.window.isDestroyed()) {
      card.window.moveTop();
    }
  });

  const size = backToFront.length;
  console.debug(`Completed to load ${size} cards`);

  addSettingsHandler(note);

  /**
   * Add task tray
   */
  initializeTaskTray(note);
});

/**
 * Exit app
 */
emitter.on('exit', () => {
  note.closeDB();
  destroyTray();
  app.quit();
});

emitter.on('change-note', async (nextNoteId: string) => {
  handlers.forEach(channel => ipcMain.removeHandler(channel));
  handlers.length = 0; // empty
  currentCardMap.clear();

  note.settings.currentNoteId = nextNoteId;
  await note.settingsDB.put(note.settings);

  setTrayContextMenu();

  const cardProps = await note.loadCurrentNote();

  const renderers: Promise<void>[] = [];
  cardProps.forEach(cardProp => {
    const card = new Card(note, cardProp);
    currentCardMap.set(cardProp.url, card);
    renderers.push(card.render());
  });
  await Promise.all(renderers).catch(e => {
    console.error(`Error while rendering cards in ready event: ${e.message}`);
  });

  const backToFront = [...currentCardMap.values()].sort((a, b) => {
    if (a.geometry.z > b.geometry.z) return 1;
    else if (a.geometry.z < b.geometry.z) return -1;
    return 0;
  });
  setZIndexOfTopCard(backToFront[backToFront.length - 1].geometry.z);
  setZIndexOfBottomCard(backToFront[0].geometry.z);
  backToFront.forEach(card => {
    if (card.window && !card.window.isDestroyed()) {
      card.window.moveTop();
    }
  });

  const size = backToFront.length;
  console.debug(`Completed to load ${size} cards`);
});

app.on('window-all-closed', () => {
  if (note.changingToNoteId === 'exit') {
    emitter.emit('exit');
  }
  else if (note.changingToNoteId !== 'none') {
    emitter.emit('change-note', note.changingToNoteId);
  }
  note.changingToNoteId = 'none';
});

/**
 * ipcMain handles
 */

ipcMain.handle(
  'update-card',
  async (event, cardProp: CardProp, savingTarget: SavingTarget) => {
    const card = currentCardMap.get(cardProp.url);
    if (savingTarget === 'BodyOnly' || savingTarget === 'Card') {
      await note.updateCardBody(cardProp);

      // Update currentCardMap
      card!.version = cardProp.version;
      card!.type = cardProp.type;
      card!.user = cardProp.user;
      card!.date = cardProp.date;
      card!._body = cardProp._body;
    }
    if (savingTarget === 'PropertyOnly' || savingTarget === 'Card') {
      await note.updateCardDoc(cardProp);

      // Update currentCardMap
      card!.geometry = cardProp.geometry;
      card!.style = cardProp.style;
      card!.condition = cardProp.condition;
    }
  }
);

ipcMain.handle('delete-card', async (event, url: string) => {
  await note.deleteCard(url);
  await note.deleteCardBody(getCardIdFromUrl(url));
});

ipcMain.handle('finish-render-card', (event, url: string) => {
  const card = currentCardMap.get(url);
  if (card) {
    card.renderingCompleted = true;
  }
});

ipcMain.handle(
  'create-card',
  async (event, cardProp: CardProp): Promise<void> => {
    if (cardProp.url === undefined) {
      const cardId = generateNewCardId();
      cardProp.url = `${APP_SCHEME}://local/${note.settings.currentNoteId}/${cardId}`;
    }
    await createCard(note, cardProp);
  }
);

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
  //  return uuidv4();
});

ipcMain.handle('bring-to-front', (event, cardProp: CardProp, rearrange = false): number => {
  // Database Update
  if (cardProp.geometry.z === getZIndexOfTopCard()) {
    // console.log('skip: ' + cardProp.geometry.z);
    // console.log([...currentCardMap.values()].map(myCard => myCard.geometry.z));
    return cardProp.geometry.z;
  }

  // console.log([...currentCardMap.values()].map(myCard => myCard.geometry.z));

  const zIndex = getZIndexOfTopCard() + 1;
  // console.debug(`new zIndex: ${zIndex}`);

  // Async
  cardProp.geometry.z = zIndex;
  note.updateCardDoc(cardProp);

  // Update card
  currentCardMap.get(cardProp.url)!.geometry.z = zIndex;

  // console.log([...currentCardMap.values()].map(myCard => myCard.geometry.z));

  // NOTE: When bring-to-front is invoked by focus event, the card has been already brought to front.
  const backToFront = [...currentCardMap.values()].sort((a, b) => {
    if (a.geometry.z > b.geometry.z) return 1;
    if (a.geometry.z < b.geometry.z) return -1;
    return 0;
  });
  setZIndexOfTopCard(backToFront[backToFront.length - 1].geometry.z);
  setZIndexOfBottomCard(backToFront[0].geometry.z);
  if (rearrange) {
    backToFront.forEach(card => {
      console.debug(`sorting zIndex..: ${card.geometry.z}`);

      if (card.window && !card.window.isDestroyed()) {
        card.window.moveTop();
      }
    });
  }
  return zIndex;
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
