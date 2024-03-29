/* eslint-disable complexity */
/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */

import path from 'path';
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
import ProgressBar from 'electron-progressbar';
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
import {
  defaultIndexDir,
  defaultLogDir,
  defaultSoundDir,
  soundSrcDir,
} from './modules_common/store.types';
import {
  getRandomInt,
  getSketchUrlFromSketchId,
  getTextLabel,
  isLabelOpened,
  sleep,
} from './modules_common/utils';
import { initializeUrlSchema, openURL } from './modules_main/url_schema';
import { DEFAULT_CARD_GEOMETRY } from './modules_common/const';
import { MESSAGE } from './modules_main/messages';
import { playSound, soundFiles } from './modules_main/sound';
import {
  moveCardOutsideFromBottom,
  moveCardOutsideFromTop,
} from './modules_main/card_locator';
import { openDashboard } from './modules_main/dashboard';
import { addDashboardHandler } from './modules_main/dashboard_eventhandler';

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.setAppUserModelId('com.squirrel.Petasti.Petasti');
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
      if (i >= retry) note.logger.error(console.error(err.message));
      return 'cannot_create';
    });
    if (resEnsure === 'cannot_create') {
      // eslint-disable-next-line no-await-in-loop
      await sleep(2000);
      note.logger.error('retrying ensure defaultLogDir in startApp');
      continue;
    }
  }
  for (let i = 0; i < retry + 1; i++) {
    // eslint-disable-next-line no-await-in-loop
    const resEnsure = await fs.ensureDir(defaultIndexDir).catch((err: Error) => {
      if (i >= retry) note.logger.error(console.error(err.message));
      return 'cannot_create';
    });
    if (resEnsure === 'cannot_create') {
      // eslint-disable-next-line no-await-in-loop
      await sleep(2000);
      note.logger.error('retrying ensure defaultIndexDir in startApp');
      continue;
    }
  }

  // TODO: Check sound file list
  // Copy sounds
  if (!fs.existsSync(defaultSoundDir)) {
    await fs.ensureDir(defaultSoundDir);
  }

  // Copy sounds
  // Cannot use recursive fs.copy in squirrel asar package.
  // fs.copy(soundSrcDir, defaultSoundDir);
  const sounds = Object.values(soundFiles);
  sounds.forEach(file => {
    const dst = path.join(defaultSoundDir, file);
    if (!fs.existsSync(dst)) {
      const src = path.join(soundSrcDir, file);
      fs.copyFileSync(src, dst);
    }
  });

  // load workspaces
  const cardProps = await note.loadNotebook();

  // Async
  note
    .rebuildSearchIndex()
    .then(() => {
      note.cardCollection.serializeIndex();
      note.noteCollection.serializeIndex();
    })
    .catch(() => {});

  let loadingNoteProgressBar: ProgressBar | undefined = new ProgressBar({
    text: MESSAGE('loadingNoteProgressBarTitle'),
    detail: MESSAGE('loadingNoteProgressBarBody'),
    indeterminate: true,
  });
  loadingNoteProgressBar.on('completed', () => {
    if (loadingNoteProgressBar) loadingNoteProgressBar.detail = MESSAGE('completed');
  });
  loadingNoteProgressBar.on('aborted', () => {
    if (loadingNoteProgressBar)
      loadingNoteProgressBar.detail = MESSAGE('loadingNoteFailed');
  });

  try {
    const renderers: Promise<void>[] = [];
    cardProps.forEach(cardProp => {
      const card = new Card(note, cardProp.url, cardProp.body, cardProp.sketch);
      cacheOfCard.set(cardProp.url, card);
      renderers.push(card.render());
    });
    await Promise.all(renderers).catch(e => {
      console.error(`Error while rendering cards in ready event: ${e.message}`);
    });
  } catch (err) {
    // Show error
    if (loadingNoteProgressBar) loadingNoteProgressBar.close();
    note.logger.debug('# Error in initializing renderers: ' + err);
    // TODO: Need detailed error message for user.
    return;
  }

  if (loadingNoteProgressBar) {
    loadingNoteProgressBar.setCompleted();
    setTimeout(() => {
      if (loadingNoteProgressBar) loadingNoteProgressBar.close();
      loadingNoteProgressBar = undefined;
    }, 100);
  }

  const backToFront = sortCardWindows(note.currentZOrder);

  const size = backToFront.length;
  console.debug(`Completed to load ${size} cards`);

  if (!isRestart) {
    addSettingsHandler(note);
    addDashboardHandler(note);
  }

  /**
   * Add task tray
   */
  initializeTaskTray(note);

  /**
   * Initialize URL schema
   */
  initializeUrlSchema(note);

  // for debug
  /*
  if (
    !app.isPackaged &&
    process.env.NODE_ENV === 'development' &&
    process.env.DASHBOARD === 'open'
  ) {
    openDashboard(note);
  }
  */
  openDashboard(note, undefined, true);
};

app.on('ready', () => {
  startApp(false);
});

/**
 * Close current note
 */
const closeCurrentNote = () => {
  handlers.forEach(channel => ipcMain.removeHandler(channel));
  handlers.length = 0; // empty
  cacheOfCard.clear();
};

/**
 * Close notebook
 */
const closeNotebook = async () => {
  await closeCurrentNote();

  await note.closeDB().catch(() => {});
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
emitter.on('change-note', async (nextNoteId: string, focusedSketchId: string) => {
  let loadingNoteProgressBar: ProgressBar | undefined = new ProgressBar({
    text: MESSAGE('loadingNoteProgressBarTitle'),
    detail: MESSAGE('loadingNoteProgressBarBody'),
    indeterminate: true,
  });
  loadingNoteProgressBar.on('completed', () => {
    if (loadingNoteProgressBar) loadingNoteProgressBar.detail = MESSAGE('completed');
  });
  loadingNoteProgressBar.on('aborted', () => {
    if (loadingNoteProgressBar)
      loadingNoteProgressBar.detail = MESSAGE('loadingNoteFailed');
  });

  try {
    await closeCurrentNote();

    // Open note
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
    const backToFront = sortCardWindows(note.currentZOrder);

    const size = backToFront.length;
    console.debug(`Completed to load ${size} cards`);
  } catch (err) {
    // Show error
    note.logger.debug('# Error in change-note: ' + err);
    if (loadingNoteProgressBar) {
      try {
        loadingNoteProgressBar.close();
      } catch (err2) {}
    }
    // TODO: Need detailed error message for user.
    return;
  }

  if (focusedSketchId) {
    const card = cacheOfCard.get(getSketchUrlFromSketchId(focusedSketchId));
    if (card) {
      card.focus();
      if (isLabelOpened(card.sketch.label.status)) {
        card.window?.webContents.send('transform-from-label');
      }
    }
  }

  if (loadingNoteProgressBar) {
    loadingNoteProgressBar.setCompleted();
    setTimeout(() => {
      if (loadingNoteProgressBar) loadingNoteProgressBar.close();
      loadingNoteProgressBar = undefined;
    }, 100);
  }
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
    emitter.emit('change-note', note.changingToNoteId, note.changingToNoteFocusedSketchId);
  }
  else {
    // Shutdown app
    // ... not work!
    // note.cardCollection.serializeIndex();
    // note.noteCollection.serializeIndex();
  }
  note.changingToNoteId = 'none';
  note.changingToNoteFocusedSketchId = '';
});

/**
 * Create card by event emitter
 */
emitter.on(
  'create-card',
  (
    cardBody: Partial<CardBody>,
    cardSketch: Partial<CardSketch>,
    moveToRect: Rectangle,
    srcSketchUrl?: string
  ) => {
    setTimeout(() => {
      playSound('create', 5);

      createCardWindow(
        note,
        note.settings.currentNoteId,
        cardBody,
        cardSketch,
        true,
        moveToRect
      )
        .then(newSketchUrl => {
          if (srcSketchUrl) {
            const markdown = cacheOfCard.get(newSketchUrl)?.body._body;
            if (markdown) {
              const link = `[${getTextLabel(markdown, 30, true)}](${newSketchUrl})`;
              const srcCard = cacheOfCard.get(srcSketchUrl);
              if (srcCard) {
                srcCard.window?.webContents.send('replace-selection', link);
                // Need focus to refresh view
                srcCard!.focus();
              }
            }
          }
        })
        .catch(() => {});
    }, 100);
  }
);

/**
 * ipcMain handles
 */

ipcMain.handle('delete-card', async (event, url: string) => {
  await moveCardOutsideFromTop(url);
  await note.deleteCard(url);
});

ipcMain.handle('delete-card-sketch', async (event, url: string) => {
  await moveCardOutsideFromBottom(url);
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
    playSound('create', 5);

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
  if (card && card.window) {
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
  if (card && card.window) {
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
  if (card && card.window) {
    console.debug(`blur: ${url}`);
    card.window.blur();
  }
});

ipcMain.handle('focus', (event, url: string) => {
  const card = cacheOfCard.get(url);
  if (card && card.window) {
    console.debug(`focus: ${url}`);
    card.focus();
  }
});

ipcMain.handle('openURL', (event, url: string) => {
  openURL(url);
});

ipcMain.handle('set-title', (event, url: string, title: string) => {
  const card = cacheOfCard.get(url);
  if (card && card.window) {
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
    return card?.window?.getBounds();
  }
);

ipcMain.handle('start-transform', (event, shape: 'label' | 'card') => {
  if (shape === 'label') {
    playSound('drop', 3);
  }
  else if (shape === 'card') {
    playSound('create', 5);
  }
});

ipcMain.handle('get-uuid', () => {
  //  return uuidv4();
});

ipcMain.handle(
  'send-mouse-input',
  (event, url: string, mouseInputEvent: MouseInputEvent[]) => {
    const card = cacheOfCard.get(url);
    mouseInputEvent.forEach(e => {
      card?.window?.webContents.sendInputEvent(e);
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
  card?.window?.setPosition(x - mouseOffsetX, y - mouseOffsetY);
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
