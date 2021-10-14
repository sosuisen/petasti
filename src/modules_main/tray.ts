/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';
import prompt from 'electron-prompt';
import { app, Menu, MenuItemConstructorOptions, Tray } from 'electron';
import { closeSettings, openSettings } from './settings';
import { createCardWindow } from './card';
import { emitter } from './event';
import {
  generateNewCardId,
  getCurrentDateAndTime,
  getRandomInt,
} from '../modules_common/utils';
import { cardColors, ColorName, darkenHexColor } from '../modules_common/color';
import {
  APP_ICON_NAME,
  APP_ICON_NAME_MONO,
  APP_SCHEME,
  DEFAULT_CARD_GEOMETRY,
} from '../modules_common/const';
import { CardSketch, Snapshot } from '../modules_common/types';
import { MESSAGE } from './messages';
import { cacheOfCard } from './card_cache';
import { INote } from './note_types';
import { showDialog } from './utils_main';
import { noteStore } from './note_store';
import { noteDeleteCreator, noteUpdateCreator } from './note_action_creator';

/**
 * Task tray
 */
let note: INote;

// Ensure a reference to Tray object is retained, or it will be GC'ed.
let tray: Tray;
export const destroyTray = () => {
  if (tray !== undefined && !tray.isDestroyed()) {
    emitter.off('updateTrayContextMenu', updateTrayContextMenu);
    tray.destroy();
  }
};

let currentLanguage: string;
let color = { ...cardColors };
// @ts-ignore
delete color.transparent;

const createRandomColorCard = async () => {
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

  const url = `${APP_SCHEME}://local/${note.settings.currentNoteId}/${cardId}`;

  const cardSketch: Partial<CardSketch> = {
    geometry,
    style: {
      uiColor: darkenHexColor(bgColor),
      backgroundColor: bgColor,
      opacity: 1.0,
      zoom: 1.0,
    },
  };

  await createCardWindow(note, url, {}, cardSketch);
};

export const setTrayContextMenu = () => {
  if (!tray) {
    return;
  }
  const currentNote = noteStore.getState().get(note.settings.currentNoteId);

  let changeNotes: MenuItemConstructorOptions[] = [];
  if (currentNote !== null) {
    changeNotes = [...noteStore.getState().values()]
      .sort(function (a, b) {
        if (a.name > b.name) return 1;
        else if (a.name < b.name) return -1;
        return 0;
      })
      .map(noteProp => {
        return {
          label: `${noteProp.name}`,
          type: 'radio',
          checked: noteProp._id === note.settings.currentNoteId,
          click: () => {
            if (noteProp._id !== note.settings.currentNoteId) {
              closeSettings();
              if (cacheOfCard.size === 0) {
                emitter.emit('change-note', noteProp._id);
              }
              else {
                note.changingToNoteId = noteProp._id;
                try {
                  // Remove listeners firstly to avoid focus another card in closing process
                  cacheOfCard.forEach(card =>
                    card.removeWindowListenersExceptClosedEvent()
                  );
                  cacheOfCard.forEach(card => card.window.webContents.send('card-close'));
                } catch (e) {
                  console.error(e);
                }
                // wait 'window-all-closed' event
              }
            }
          },
        };
      });
  }
  if (changeNotes.length > 0) {
    changeNotes.unshift({
      type: 'separator',
    } as MenuItemConstructorOptions);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: MESSAGE('newCard'),
      click: () => {
        createRandomColorCard();
      },
    },
    {
      type: 'separator',
    },
    {
      label: MESSAGE('noteNew'),
      click: async () => {
        const newName: string | void | null = await prompt({
          title: MESSAGE('note'),
          label: MESSAGE('noteNewName'),
          value: `${MESSAGE('noteName', String(noteStore.getState().size + 1))}`,
          inputAttrs: {
            type: 'text',
            required: 'true',
          },
          height: 200,
        }).catch(e => console.error(e.message));

        if (
          newName === null ||
          newName === undefined ||
          newName === '' ||
          (newName as string).match(/^\s+$/)
        ) {
          return;
        }
        const [newNoteProp] = await note.createNote(newName as string, true);
        closeSettings();

        if (cacheOfCard.size === 0) {
          emitter.emit('change-note', newNoteProp._id);
        }
        else {
          // eslint-disable-next-line require-atomic-updates
          note.changingToNoteId = newNoteProp._id;
          try {
            // Remove listeners firstly to avoid focus another card in closing process
            cacheOfCard.forEach(card => card.removeWindowListenersExceptClosedEvent());
            cacheOfCard.forEach(card => card.window.webContents.send('card-close'));
          } catch (e) {
            console.error(e);
          }
          // wait 'window-all-closed' event
        }

        // setTrayContextMenu() will be called in change-note event.
      },
    },
    {
      label: MESSAGE('noteRename'),
      click: async () => {
        const noteProp = noteStore.getState().get(note.settings.currentNoteId)!;

        const newName: string | void | null = await prompt({
          title: MESSAGE('note'),
          label: MESSAGE('noteNewName'),
          value: noteProp!.name,
          inputAttrs: {
            type: 'text',
            required: 'true',
          },
          height: 200,
        }).catch(e => console.error(e.message));

        if (
          newName === null ||
          newName === undefined ||
          newName === '' ||
          (newName as string).match(/^\s+$/)
        ) {
          return;
        }

        noteProp.name = newName as string;
        noteProp.date.modifiedDate = getCurrentDateAndTime();
        await noteStore.dispatch(
          // @ts-ignore
          noteUpdateCreator(note, noteProp)
        );

        setTrayContextMenu();
        cacheOfCard.forEach(card => card.resetContextMenu());
      },
    },
    {
      label: MESSAGE('noteDelete'),
      enabled: noteStore.getState().size > 1,
      click: async () => {
        if (noteStore.getState().size <= 1) {
          return;
        }
        if (cacheOfCard.size > 0) {
          showDialog(undefined, 'info', 'noteCannotDelete');
          return;
        }
        const noteIdList = note.getSortedNoteIdList();
        const currentNoteIndex = noteIdList.indexOf(note.settings.currentNoteId);
        const nextNoteIndex = currentNoteIndex > 0 ? currentNoteIndex - 1 : 0;
        // Delete current note
        await noteStore.dispatch(noteDeleteCreator(note, note.settings.currentNoteId));

        // eslint-disable-next-line require-atomic-updates
        note.settings.currentNoteId = noteIdList[nextNoteIndex];
        emitter.emit('change-note', note.settings.currentNoteId);

        // setTrayContextMenu() will be called in change-note event.
      },
    },
    ...changeNotes,
    {
      type: 'separator',
    },
    {
      label: MESSAGE('saveSnapshot'),
      click: async () => {
        const noteProp = noteStore.getState().get(note.settings.currentNoteId);
        const name = noteProp!.name + ' ' + getCurrentDateAndTime();
        const backgroundColor = '#D9E5FF';
        const backgroundImage = '';
        cacheOfCard.forEach(card => {});
        const snapshot: Snapshot = {
          version: '1.0',
          name,
          backgroundColor,
          backgroundImage,
          note: noteProp!,
          cards: [...cacheOfCard.values()].map(tmpCard => {
            const clonedBody = JSON.parse(JSON.stringify(tmpCard.body));
            delete clonedBody._id;
            const clonedSketch = JSON.parse(JSON.stringify(tmpCard.sketch));
            delete clonedSketch._id;
            return {
              _id: tmpCard.body._id,
              body: clonedBody,
              sketch: clonedSketch,
            };
          }),
        };
        await note.createSnapshot(snapshot);
      },
    },
    {
      label: MESSAGE('syncNow'),
      enabled: note.settings.sync.enabled,
      click: () => {
        if (note.sync !== undefined) {
          note.sync.trySync();
        }
      },
    },
    {
      label: MESSAGE('settings'),
      click: () => {
        openSettings(note);
      },
    },
    {
      label: MESSAGE('exit'),
      click: () => {
        note.changingToNoteId = 'exit';
        closeSettings();
        if (cacheOfCard.size === 0) {
          emitter.emit('exit');
        }
        else {
          try {
            cacheOfCard.forEach(card => {
              card.window.webContents.send('card-close');
            });
          } catch (e) {
            console.error(e);
            emitter.emit('exit');
          }
        }
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  // const version = process.env.npm_package_version; // It is only available when the app is started by 'npm start'
  let taskTrayToolTip = `${app.getName()}  ${app.getVersion()}`;
  if (!app.isPackaged) {
    taskTrayToolTip += ' (Development)';
  }
  tray.setToolTip(taskTrayToolTip);
};

export const initializeTaskTray = (store: INote) => {
  note = store;

  emitter.on('updateTrayContextMenu', updateTrayContextMenu);

  if (process.platform === 'darwin') {
    tray = new Tray(path.join(__dirname, '../assets/' + APP_ICON_NAME_MONO));
  }
  else {
    tray = new Tray(path.join(__dirname, '../assets/' + APP_ICON_NAME));
  }

  currentLanguage = note.settings.language;
  setTrayContextMenu();

  tray.on('click', () => {
    // NOTE: click of tray on macOS opens context menu.
    if (process.platform !== 'darwin') {
      tray.popUpContextMenu();
    }
  });

  tray.on('double-click', () => {
    // NOTE: double-click does not occur on linux.
    // double-click does not occur on macOS while context-menu is opened.
    // So double-click is only occurred on Windows.
    createRandomColorCard();
  });

  // for debug
  if (
    !app.isPackaged &&
    process.env.NODE_ENV === 'development' &&
    process.env.SETTINGS_DIALOG === 'open'
  ) {
    openSettings(note);
  }
};

const updateTrayContextMenu = () => {
  const newLanguage = note.settings.language;
  if (currentLanguage !== newLanguage) {
    currentLanguage = newLanguage;
    setTrayContextMenu();
  }
};
