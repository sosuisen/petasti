/**
 * TreeStickies
 * © 2022 Hidekazu Kubota
 */
import path from 'path';
import prompt from 'electron-prompt';
import {
  app,
  clipboard,
  globalShortcut,
  Menu,
  MenuItemConstructorOptions,
  Tray,
} from 'electron';
import ProgressBar from 'electron-progressbar';
import { TaskMetadata } from 'git-documentdb';
import { closeSettings, openSettings } from './settings';
import { createRandomColorCard, minimizeAllCards, sortCardWindows } from './card';
import { emitter } from './event';
import {
  getCardIdFromUrl,
  getCurrentDateAndTime,
  getCurrentLocalDate,
  getNoteIdFromUrl,
  getRandomInt,
  getUrlFromNoteId,
} from '../modules_common/utils';
import {
  APP_ICON_NAME,
  APP_ICON_NAME_MONO,
  APP_SCHEME,
  DEFAULT_CARD_GEOMETRY,
  DEFAULT_CARD_LABEL,
  MINIMUM_WINDOW_HEIGHT,
  MINIMUM_WINDOW_HEIGHT_OFFSET,
} from '../modules_common/const';
import { CardBody, CardSketch, ICard, Snapshot } from '../modules_common/types';
import { MESSAGE } from './messages';
import { cacheOfCard, closeAllCards } from './card_cache';
import { INote } from './note_types';
import { regExpResidentNote, showDialog } from './utils_main';
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

export const setTrayContextMenu = () => {
  if (!tray) {
    return;
  }
  try {
    const currentNote = noteStore.getState().get(note.settings.currentNoteId);

    const createLinkOfNote: MenuItemConstructorOptions[] = [
      ...noteStore.getState().values(),
    ]
      .sort((a, b) => {
        if (a.name > b.name) return 1;
        else if (a.name < b.name) return -1;
        return 0;
      })
      .reduce((result, noteProp) => {
        result.push({
          label: `${noteProp.name}`,
          click: () => {
            const url = getUrlFromNoteId(noteProp._id);
            const markdown = `[${noteProp.name}](${url})`;
            const cardBody: Partial<CardBody> = {
              _body: markdown,
            };
            const geometry = { ...DEFAULT_CARD_GEOMETRY };
            geometry.x += getRandomInt(30, 100);
            geometry.y += getRandomInt(30, 100);
            const label = { ...DEFAULT_CARD_LABEL };
            label.x = geometry.x;
            label.y = geometry.y;
            label.width = Math.floor(geometry.width * 0.7);
            label.height = MINIMUM_WINDOW_HEIGHT + MINIMUM_WINDOW_HEIGHT_OFFSET;
            label.zoom = 1.0;
            label.text = `<p class="paragraph"><a href="${url}" class="link" target="_blank">${noteProp.name}</a></p>`;
            label.status = 'openedLabel';
            const cardSketch: Partial<CardSketch> = {
              geometry,
              label,
            };

            createRandomColorCard(note, cardBody, cardSketch);
          },
        });
        return result;
      }, [] as MenuItemConstructorOptions[]);

    const copyUrlOfNote: MenuItemConstructorOptions[] = [...noteStore.getState().values()]
      .sort((a, b) => {
        if (a.name > b.name) return 1;
        else if (a.name < b.name) return -1;
        return 0;
      })
      .reduce((result, noteProp) => {
        result.push({
          label: `${noteProp.name}`,
          click: () => {
            const noteUrl = getUrlFromNoteId(noteProp._id);
            clipboard.writeText(noteUrl);
          },
        });
        return result;
      }, [] as MenuItemConstructorOptions[]);

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
                  note.updateNoteZOrder();
                  emitter.emit('change-note', noteProp._id);
                }
                else {
                  note.changingToNoteId = noteProp._id;
                  try {
                    closeAllCards(note);
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
      ...changeNotes,
      {
        type: 'separator',
      },
      {
        label: MESSAGE('newCard'),
        click: () => {
          createRandomColorCard(note);
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
          setTrayContextMenu();
          cacheOfCard.forEach(card => card.resetContextMenu());
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
          noteProp.isResident = regExpResidentNote.test(newName as string);
          noteProp.date.modifiedDate = getCurrentDateAndTime();
          await noteStore.dispatch(
            // @ts-ignore
            noteUpdateCreator(note, noteProp)
          );

          setTrayContextMenu();

          // Need not to call resetContextMenu because each card does not refer current note name.
          // cacheOfCard.forEach(card => card.resetContextMenu());
        },
      },
      {
        label: MESSAGE('noteDuplicate'),
        click: async () => {
          const noteProp = noteStore.getState().get(note.settings.currentNoteId)!;

          const newName: string | void | null = await prompt({
            title: MESSAGE('note'),
            label: MESSAGE('noteNewNameDuplicate'),
            value: noteProp!.name + MESSAGE('copyOf'),
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

          const progressBar = new ProgressBar({
            text: MESSAGE('duplicatingNoteProgressBarTitle'),
            detail: MESSAGE('duplicatingNoteProgressBarBody'),
          });
          progressBar.on('completed', () => {
            progressBar.detail = MESSAGE('completed');
          });

          const [newNoteProp] = await note.createNote(newName as string, true);

          const promises: Promise<TaskMetadata>[] = [];

          for (const card of cacheOfCard.values()) {
            // Skip resident cards
            if (getNoteIdFromUrl(card.url) !== note.settings.currentNoteId) continue;

            const newCardSketch = JSON.parse(JSON.stringify(card.sketch));
            const newSketchId = `${newNoteProp._id}/${getCardIdFromUrl(card.url)}`;
            const newUrl = `${APP_SCHEME}://local/${newSketchId}`;
            newCardSketch._id = newSketchId;
            promises.push(note.createCardSketch(newUrl, newCardSketch, true));
          }
          const tmpSyncAfterChanges = note.settings.sync.syncAfterChanges;
          note.settings.sync.syncAfterChanges = false;
          await Promise.all(promises).catch(err => {
            progressBar.close();
            showDialog(undefined, 'error', 'databaseCreateError', (err as Error).message);
            console.log(err);
          });
          progressBar.close();
          // eslint-disable-next-line require-atomic-updates
          note.settings.sync.syncAfterChanges = tmpSyncAfterChanges;
          setTrayContextMenu();
          cacheOfCard.forEach(card => card.resetContextMenu());
        },
      },
      {
        label: MESSAGE('noteCreateLink'),
        submenu: [...createLinkOfNote],
      },
      {
        label: MESSAGE('noteCopyUrlToClipboard'),
        submenu: [...copyUrlOfNote],
      },
      {
        label: MESSAGE('noteDelete'),
        enabled: noteStore.getState().size > 1,
        click: async () => {
          if (noteStore.getState().size <= 1) {
            return;
          }
          let hasResidentCards = false;
          for (const key of cacheOfCard.keys()) {
            if (getNoteIdFromUrl(key) === note.settings.currentNoteId) {
              showDialog(undefined, 'info', 'noteCannotDelete');
              return;
            }
            hasResidentCards = true;
          }
          const noteIdList = note.getSortedNoteIdList();
          const currentNoteIndex = noteIdList.indexOf(note.settings.currentNoteId);
          const nextNoteIndex = currentNoteIndex > 0 ? currentNoteIndex - 1 : 0;
          // Delete current note
          await noteStore.dispatch(noteDeleteCreator(note, note.settings.currentNoteId));

          try {
            if (hasResidentCards) {
              // Close resident cards
              closeAllCards(note);
              // eslint-disable-next-line require-atomic-updates
              note.changingToNoteId = noteIdList[nextNoteIndex];
            }
            else {
              emitter.emit('change-note', noteIdList[nextNoteIndex]);
            }
            // setTrayContextMenu() will be called in change-note event.
          } catch (e) {
            console.error(e);
          }
        },
      },
      {
        type: 'separator',
      },
      {
        label: MESSAGE('saveSnapshot'),
        click: async () => {
          const noteProp = noteStore.getState().get(note.settings.currentNoteId);
          const defaultName = noteProp!.name + ' ' + getCurrentLocalDate();

          const newName: string | void | null = await prompt({
            title: MESSAGE('saveSnapshot'),
            label: MESSAGE('snapshotName'),
            value: defaultName,
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

          const backgroundColor = '#D9E5FF';
          const backgroundImage = '';
          const cards: {
            _id: string;
            sketch: Omit<CardSketch, '_id'>;
            body: Omit<CardBody, '_id'>;
          }[] = [];
          let _body = '';
          [...cacheOfCard.values()]
            .sort((a, b) => {
              // The last modified card is the first.
              if (a.body.date.modifiedDate > b.body.date.modifiedDate) return -1;
              else if (a.body.date.modifiedDate < b.body.date.modifiedDate) return 1;
              return 0;
            })
            .forEach(tmpCard => {
              const clonedBody = JSON.parse(JSON.stringify(tmpCard.body));
              delete clonedBody._id;
              const clonedSketch = JSON.parse(JSON.stringify(tmpCard.sketch));
              delete clonedSketch._id;
              cards.push({
                _id: tmpCard.body._id,
                body: clonedBody,
                sketch: clonedSketch,
              });
              if (_body !== '') {
                _body += '\n---\n';
              }
              _body += clonedBody._body;
            });
          const snapshot: Snapshot = {
            version: '1.0',
            name: newName as string,
            backgroundColor,
            backgroundImage,
            createdDate: getCurrentDateAndTime(),
            note: noteProp!,
            cards,
            _body,
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
        label: MESSAGE('redisplayCards'),
        click: () => {
          sortCardWindows(
            noteStore.getState().get(note.settings.currentNoteId)!.zOrder,
            true
          );
        },
      },
      {
        label: MESSAGE('minimizeAllCards'),
        click: () => {
          minimizeAllCards(note.currentZOrder);
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
              closeAllCards(note);
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
  } catch (err) {
    note.logger.debug('# Error in setTrayContextMenu: ' + err);
  }
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
    createRandomColorCard(note);
  });

  let opt = 'Alt';
  if (process.platform === 'darwin') {
    opt = 'Option';
  }
  globalShortcut.registerAll([`CommandOrControl+${opt}+Enter`], () => {
    tray.popUpContextMenu();
  });
  // 'F'ront
  globalShortcut.registerAll([`CommandOrControl+${opt}+F`], () => {
    sortCardWindows(note.currentZOrder, true);
  });
  // 'B'ack
  globalShortcut.registerAll([`CommandOrControl+${opt}+B`], () => {
    minimizeAllCards(note.currentZOrder);
  });

  // for debug
  if (
    !app.isPackaged &&
    process.env.NODE_ENV === 'development' &&
    process.env.SETTINGS_DIALOG === 'open'
  ) {
    openSettings(note);
  }

  note.tray = tray;
};

const updateTrayContextMenu = () => {
  const newLanguage = note.settings.language;
  if (currentLanguage !== newLanguage) {
    currentLanguage = newLanguage;
    setTrayContextMenu();
  }
};
