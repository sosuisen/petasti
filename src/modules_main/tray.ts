/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';
import prompt from 'electron-prompt';
import { app, dialog, Menu, MenuItemConstructorOptions, Tray } from 'electron';
import { closeSettings, openSettings, settingsDialog } from './settings';
import { Card, createCard, currentCardMap } from './card';
import { emitter } from './event';
import {
  generateNewCardId,
  getCurrentDateAndTime,
  getRandomInt,
} from '../modules_common/utils';
import { cardColors, ColorName, darkenHexColor } from '../modules_common/color';
import { APP_ICON_NAME, APP_SCHEME, DEFAULT_CARD_GEOMETRY } from '../modules_common/const';
import { MESSAGE, noteStore } from './note_store';
import { CardProp } from '../modules_common/types';

/**
 * Task tray
 */

// Ensure a reference to Tray object is retained, or it will be GC'ed.
let tray: Tray;
export const destroyTray = () => {
  if (tray !== undefined && !tray.isDestroyed()) {
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
  const cardProp: Partial<CardProp> = {
    url: `${APP_SCHEME}://local/${noteStore.settings.currentNoteId}/${cardId}`,
    geometry,
    style: {
      uiColor: darkenHexColor(bgColor),
      backgroundColor: bgColor,
      opacity: 1.0,
      zoom: 1.0,
    },
  };

  await createCard(cardProp);
};

export const setTrayContextMenu = () => {
  if (!tray) {
    return;
  }
  const currentNote = noteStore.notePropMap.get(noteStore.settings.currentNoteId);

  let changeNotes: MenuItemConstructorOptions[] = [];
  if (currentNote !== null) {
    changeNotes = [...noteStore.notePropMap.values()]
      .sort(function (a, b) {
        if (a.name > b.name) return 1;
        else if (a.name < b.name) return -1;
        return 0;
      })
      .map(note => {
        return {
          label: `${note.name}`,
          type: 'radio',
          checked: note._id === noteStore.settings.currentNoteId,
          click: () => {
            if (note._id !== noteStore.settings.currentNoteId) {
              closeSettings();
              if (currentCardMap.size === 0) {
                emitter.emit('change-note', note._id);
              }
              else {
                noteStore.changingToNoteId = note._id;
                try {
                  // Remove listeners firstly to avoid focus another card in closing process
                  currentCardMap.forEach(card =>
                    card.removeWindowListenersExceptClosedEvent()
                  );
                  currentCardMap.forEach(card =>
                    card.window.webContents.send('card-close')
                  );
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
          value: `${MESSAGE('noteName', String(noteStore.notePropMap.size + 1))}`,
          inputAttrs: {
            type: 'text',
            required: true,
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
        const newNoteProp = await noteStore.createNote(newName as string);

        const firstCard = new Card(newNoteProp._id);
        const firstCardProp = firstCard.toObject();
        // Async
        await noteStore.updateCardDoc(firstCardProp);
        await noteStore.updateSketchDoc(firstCardProp);

        closeSettings();

        if (currentCardMap.size === 0) {
          emitter.emit('change-note', newNoteProp._id);
        }
        else {
          // eslint-disable-next-line require-atomic-updates
          noteStore.changingToNoteId = newNoteProp._id;
          try {
            // Remove listeners firstly to avoid focus another card in closing process
            currentCardMap.forEach(card => card.removeWindowListenersExceptClosedEvent());
            currentCardMap.forEach(card => card.window.webContents.send('card-close'));
          } catch (e) {
            console.error(e);
          }
          // wait 'window-all-closed' event
        }
      },
    },
    {
      label: MESSAGE('noteRename'),
      click: async () => {
        const noteProp = noteStore.notePropMap.get(noteStore.settings.currentNoteId)!;

        const newName: string | void | null = await prompt({
          title: MESSAGE('note'),
          label: MESSAGE('noteNewName'),
          value: noteProp!.name,
          inputAttrs: {
            type: 'text',
            required: true,
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
        await noteStore.updateNoteDoc(noteProp);

        setTrayContextMenu();
        currentCardMap.forEach(card => card.resetContextMenu());
      },
    },
    {
      label: MESSAGE('noteDelete'),
      enabled: noteStore.notePropMap.size > 1,
      click: async () => {
        if (noteStore.notePropMap.size <= 1) {
          return;
        }
        if (currentCardMap.size > 0) {
          dialog.showMessageBox({
            type: 'info',
            buttons: ['OK'],
            message: MESSAGE('noteCannotDelete'),
          });
          return;
        }
        // Delete current note
        await noteStore.deleteNoteDoc(noteStore.settings.currentNoteId);
        noteStore.notePropMap.delete(noteStore.settings.currentNoteId);

        noteStore.settings.currentNoteId = noteStore.getSortedNoteIdList()[0];
        emitter.emit('change-note', noteStore.settings.currentNoteId);
      },
    },
    ...changeNotes,
    {
      type: 'separator',
    },
    {
      label: MESSAGE('settings'),
      click: () => {
        openSettings();
      },
    },
    {
      label: MESSAGE('exit'),
      click: () => {
        if (settingsDialog && !settingsDialog.isDestroyed()) {
          settingsDialog.close();
        }
        //        setChangingToWorkspaceId('exit');
        closeSettings();
        if (currentCardMap.size === 0) {
          emitter.emit('exit');
        }
        else {
          try {
            currentCardMap.forEach(card => {
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

export const initializeTaskTray = () => {
  tray = new Tray(path.join(__dirname, '../assets/' + APP_ICON_NAME));
  currentLanguage = noteStore.settings.language;
  setTrayContextMenu();

  tray.on('click', () => {
    createRandomColorCard();
  });
};

emitter.on('updateTrayContextMenu', () => {
  const newLanguage = noteStore.settings.language;
  if (currentLanguage !== newLanguage) {
    currentLanguage = newLanguage;
    setTrayContextMenu();
  }
});
