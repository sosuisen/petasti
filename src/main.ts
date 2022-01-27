/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import {
  app,
  Display,
  ipcMain,
  MouseInputEvent,
  powerMonitor,
  Rectangle,
  screen,
} from 'electron';
import fs from 'fs-extra';
import {
  Card,
  createCardWindow,
  setGlobalFocusEventListenerPermission,
  sortCardWindows,
} from './modules_main/card';
import { destroyTray, initializeTaskTray, setTrayContextMenu } from './modules_main/tray';
import { emitter, handlers } from './modules_main/event';
import { note } from './modules_main/note';
import { CardBody, CardSketch } from './modules_common/types';
import { addSettingsHandler } from './modules_main/settings_eventhandler';
import { cacheOfCard } from './modules_main/card_cache';
import { DatabaseCommand } from './modules_common/db.types';
import { defaultLogDir } from './modules_common/store.types';
import { getRandomInt, sleep } from './modules_common/utils';
import { initializeUrlSchema, openURL } from './modules_main/url_schema';
import { DEFAULT_CARD_GEOMETRY } from './modules_common/const';

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.setAppUserModelId('com.squirrel.TreeStickies.TreeStickies');
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
const startApp = async (isRestart: boolean) => {
  // Ensure log directory
  const retry = 3;
  for (let i = 0; i < retry + 1; i++) {
    // eslint-disable-next-line no-await-in-loop
    const resEnsure = await fs.ensureDir(defaultLogDir).catch((err: Error) => {
      if (i >= retry) console.error(err.message);
      return 'cannot_create';
    });
    if (resEnsure === 'cannot_create') {
      // eslint-disable-next-line no-await-in-loop
      await sleep(2000);
      console.log('retrying ensureDir in startApp');
      continue;
    }
  }
  // load workspaces
  const cardProps = await note.loadNotebook();

  const renderers: Promise<void>[] = [];
  cardProps.forEach(cardProp => {
    const card = new Card(note, cardProp.url, cardProp.body, cardProp.sketch);
    cacheOfCard.set(cardProp.url, card);
    renderers.push(card.render());
  });
  await Promise.all(renderers).catch(e => {
    console.error(`Error while rendering cards in ready event: ${e.message}`);
  });

  const backToFront = sortCardWindows();

  const size = backToFront.length;
  console.debug(`Completed to load ${size} cards`);

  if (!isRestart) {
    addSettingsHandler(note);
  }

  /**
   * Add task tray
   */
  initializeTaskTray(note);

  /**
   * Initialize URL schema
   */
  initializeUrlSchema(note);
};

app.on('ready', () => {
  startApp(false);
});

/**
 * Close notebook
 */
const closeNotebook = async () => {
  handlers.forEach(channel => ipcMain.removeHandler(channel));
  handlers.length = 0; // empty
  cacheOfCard.clear();

  await note.closeDB();
  destroyTray();
};

/**
 * Exit app
 */
emitter.on('exit', async () => {
  await closeNotebook();
  app.quit();
});

/**
 * Restart app
 */
emitter.on('restart', async () => {
  await closeNotebook();
  startApp(true);
});

/**
 * Change note
 */
emitter.on('change-note', async (nextNoteId: string) => {
  handlers.forEach(channel => ipcMain.removeHandler(channel));
  handlers.length = 0; // empty
  cacheOfCard.clear();

  note.settings.currentNoteId = nextNoteId;
  await note.settingsDB.put(note.settings);
  setTrayContextMenu();

  const cardProps = await note.loadCurrentNote();
  console.time('new Card');
  const renderers: Promise<void>[] = [];
  cardProps.forEach(cardProp => {
    const card = new Card(note, cardProp.url, cardProp.body, cardProp.sketch);
    cacheOfCard.set(cardProp.url, card);
    renderers.push(card.render());
  });
  console.timeEnd('new Card');
  console.time('card.render()');
  await Promise.all(renderers).catch(e => {
    console.error(`Error while rendering cards in ready event: ${e.message}`);
  });
  console.timeEnd('card.render()');
  const backToFront = sortCardWindows();

  const size = backToFront.length;
  console.debug(`Completed to load ${size} cards`);
});

app.on('window-all-closed', () => {
  console.log('# window-all-closed: ' + note.changingToNoteId);
  if (note.changingToNoteId === 'exit') {
    emitter.emit('exit');
  }
  else if (note.changingToNoteId === 'restart') {
    emitter.emit('restart');
  }
  else if (note.changingToNoteId !== 'none') {
    emitter.emit('change-note', note.changingToNoteId);
  }
  note.changingToNoteId = 'none';
});

/**
 * Create card by event emitter
 */
emitter.on(
  'create-card',
  (cardBody: Partial<CardBody>, cardSketch: Partial<CardSketch>, moveToRect: Rectangle) => {
    setTimeout(() => {
      createCardWindow(
        note,
        note.settings.currentNoteId,
        cardBody,
        cardSketch,
        true,
        moveToRect
      );
    }, 100);
  }
);

/**
 * ipcMain handles
 */

ipcMain.handle('delete-card', async (event, url: string) => {
  await note.deleteCard(url);
});

ipcMain.handle('delete-card-sketch', async (event, url: string) => {
  await note.deleteCardSketch(url);
});

ipcMain.handle('finish-render-card', (event, url: string) => {
  const card = cacheOfCard.get(url);
  if (card) {
    card.renderingCompleted = true;
  }
});

ipcMain.handle(
  'create-card',
  async (
    event,
    sketchUrl: string | undefined,
    cardBody: Partial<CardBody>,
    cardSketch: Partial<CardSketch>,
    parentRect: Rectangle
  ): Promise<void> => {
    const xOffset = getRandomInt(10, 30);
    const yOffset = getRandomInt(10, 30);

    const moveToRect = note.calcVacantLand(
      parentRect,
      {
        x: cardSketch.geometry?.x ?? parentRect.x + 50,
        y: cardSketch.geometry?.y ?? parentRect.y + 50,
        width: cardSketch.geometry?.width ?? DEFAULT_CARD_GEOMETRY.width,
        height: cardSketch.geometry?.height ?? DEFAULT_CARD_GEOMETRY.height,
      },
      xOffset,
      yOffset
    );
    if (sketchUrl === undefined) {
      await createCardWindow(
        note,
        note.settings.currentNoteId,
        cardBody,
        cardSketch,
        true,
        moveToRect
      );
    }
    else {
      await createCardWindow(note, sketchUrl, cardBody, cardSketch, true, moveToRect);
    }
  }
);

ipcMain.handle('blur-and-focus-with-suppress-events', (event, url: string) => {
  const card = cacheOfCard.get(url);
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
    card.focus();
  }
});

ipcMain.handle('blur-and-focus-with-suppress-focus-event', (event, url: string) => {
  const card = cacheOfCard.get(url);
  if (card) {
    console.debug(`blurAndFocus: ${url}`);
    /**
     * When a card is blurred, another card will be focused automatically by OS.
     * Set suppressGlobalFocusEvent to suppress to focus another card.
     */
    setGlobalFocusEventListenerPermission(false);
    card.window.blur();
    card.recaptureGlobalFocusEventAfterLocalFocusEvent = true;
    card.focus();
  }
});

ipcMain.handle('blur', (event, url: string) => {
  const card = cacheOfCard.get(url);
  if (card) {
    console.debug(`blur: ${url}`);
    card.window.blur();
  }
});

ipcMain.handle('focus', (event, url: string) => {
  const card = cacheOfCard.get(url);
  if (card) {
    console.debug(`focus: ${url}`);
    card.focus();
  }
});

ipcMain.handle('openURL', (event, url: string) => {
  openURL(url);
});

ipcMain.handle('set-title', (event, url: string, title: string) => {
  const card = cacheOfCard.get(url);
  if (card) {
    card.window.setTitle(title);
  }
});

ipcMain.handle(
  'set-window-rect',
  async (
    event,
    url: string,
    x: number,
    y: number,
    width: number,
    height: number,
    animation = false
  ) => {
    const card = cacheOfCard.get(url);
    // eslint-disable-next-line no-unused-expressions
    await card?.setRect(x, y, width, height, animation);
    return card?.window.getBounds();
  }
);

ipcMain.handle('get-uuid', () => {
  //  return uuidv4();
});

ipcMain.handle(
  'send-mouse-input',
  (event, url: string, mouseInputEvent: MouseInputEvent[]) => {
    const card = cacheOfCard.get(url);
    if (!card) {
      return;
    }
    mouseInputEvent.forEach(e => {
      card.window.webContents.sendInputEvent(e);
    });
  }
);

ipcMain.handle('db', async (event, command: DatabaseCommand) => {
  // note.logger.debug(command.command + ' ' + command.url);
  switch (command.command) {
    case 'db-card-body-update': {
      return await note.updateCardBody(
        command.url,
        command.data,
        command.data.date.modifiedDate
      );
    }
    case 'db-card-sketch-update': {
      return await note.updateCardSketch(
        command.url,
        command.data,
        command.data.date.modifiedDate
      );
    }
    default:
      break;
  }
});

ipcMain.handle('window-moving', (e, url, { mouseOffsetX, mouseOffsetY }) => {
  const { x, y } = screen.getCursorScreenPoint();
  const card = cacheOfCard.get(url);
  card!.window.setPosition(x - mouseOffsetX, y - mouseOffsetY);
});

ipcMain.handle('window-moved', (e, url) => {
  // Do something when dragging stop
});

ipcMain.handle('get-current-display-rect', (e, points: { x: number; y: number }[]) => {
  return points.map(point => {
    const display: Display = screen.getDisplayNearestPoint(point);
    return {
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
    };
  });
});

ipcMain.handle('response-of-has-selection', (event, url: string, hasSelection: boolean) => {
  const card = cacheOfCard.get(url);
  if (card) {
    card.hasSelection = hasSelection;
  }
});

powerMonitor.on('resume', () => {
  // note.logger.debug('App resumed');
  if (note.sync) {
    // note.logger.debug('Sync resumed');
    note.sync.pause();
    note.sync.resume();
  }
});
