/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { ipcMain } from 'electron';
import prompt from 'electron-prompt';
import { DatabaseCommand } from '../modules_common/db.types';
import { INote } from './note_types';
import { dashboard } from './dashboard';
import { DashboardCommand } from '../modules_common/dashboard.types';
import { openURL } from './url_schema';
import { noteStore } from './note_store';
import { MESSAGE } from './messages';
import { cacheOfCard } from './card_cache';
import {
  getCardIdFromUrl,
  getCurrentDateAndTime,
  getRandomInt,
} from '../modules_common/utils';
import { cardColors } from '../modules_common/color';
import { CardSketch, Geometry } from '../modules_common/types';
import {
  APP_SCHEME,
  DEFAULT_CARD_CONDITION,
  DEFAULT_CARD_GEOMETRY,
  DEFAULT_CARD_LABEL,
  DIALOG_BUTTON,
} from '../modules_common/const';
import { createCardWindow } from './card';
import { noteZOrderUpdateCreator } from './note_action_creator';
import { showConfirmDialog } from './utils_main';

export const addDashboardHandler = (note: INote) => {
  // eslint-disable-next-line complexity
  ipcMain.handle('db-dashboard', async (e, command: DatabaseCommand) => {
    // eslint-disable-next-line default-case
    switch (command.command) {
      case 'search-note-and-card': {
        const noteResults = note.noteCollection.search('noteprop', command.data);
        const cardResults = note.cardCollection.search('card', command.data);

        const noteDocs = await Promise.all(
          noteResults.map(res => note.noteCollection.get(res.ref))
        );

        const cardDocs = await Promise.all(
          cardResults.map(res => note.cardCollection.get(res.ref))
        );

        dashboard.webContents.send('search-result-note-and-card', noteDocs, cardDocs);

        break;
      }
      case 'search-note': {
        const noteResults = note.noteCollection.search('noteprop', command.data);

        const noteDocs = await Promise.all(
          noteResults.map(res => note.noteCollection.get(res.ref))
        );

        dashboard.webContents.send('search-result-note', noteDocs);

        break;
      }
      case 'get-all-notes': {
        const noteDocs = [...noteStore.getState().values()].sort((a, b) => {
          if (a.name > b.name) return 1;
          else if (a.name < b.name) return -1;
          return 0;
        });

        dashboard.webContents.send('search-result-note', noteDocs);

        break;
      }
    }
  });

  // eslint-disable-next-line complexity
  ipcMain.handle('dashboard', async (e, command: DashboardCommand) => {
    // eslint-disable-next-line default-case
    switch (command.command) {
      case 'dashboard-change-note': {
        const url = command.url;
        openURL(url);
        break;
      }
      case 'dashboard-create-note': {
        const newName: string | void | null = await prompt({
          title: MESSAGE('note'),
          label: MESSAGE('noteNewName'),
          value: `${MESSAGE('noteName', String(noteStore.getState().size + 1))}`,
          inputAttrs: {
            type: 'text',
            required: 'true',
          },
          height: 200,
        }).catch(err => console.error(err.message));

        if (
          newName === null ||
          newName === undefined ||
          newName === '' ||
          (newName as string).match(/^\s+$/)
        ) {
          return;
        }
        const [newNoteProp] = await note.createNote(newName as string, true);
        cacheOfCard.forEach(card => card.resetContextMenu());

        const noteDocs = [...noteStore.getState().values()].sort((a, b) => {
          if (a.name > b.name) return 1;
          else if (a.name < b.name) return -1;
          return 0;
        });

        dashboard.webContents.send('search-result-note', noteDocs);

        break;
      }
      case 'dashboard-clone-cards': {
        const confirmResult = showConfirmDialog(
          dashboard,
          'question',
          ['btnOK', 'btnCancel'],
          'cloneCardsConfirmation'
        );

        if (confirmResult !== DIALOG_BUTTON.ok) {
          return;
        }

        const searchResults = command.data;
        for (const result of searchResults) {
          const cardId = getCardIdFromUrl(result.url);

          const geometry: Geometry = {
            x: 20,
            y: 20,
            z: 0,
            width: 250,
            height: 250,
          };
          geometry.x += getRandomInt(30, 400);
          geometry.y += getRandomInt(30, 400);
          geometry.width += getRandomInt(0, 100);
          geometry.width += getRandomInt(0, 100);

          const bgColor: string = cardColors.white;

          const newUrl = `${APP_SCHEME}://local/${note.settings.currentNoteId}/${cardId}`;

          const current = getCurrentDateAndTime();
          const date = {
            createdDate: current,
            modifiedDate: current,
          };

          const cardSketch: CardSketch = {
            geometry,
            style: {
              uiColor: bgColor,
              backgroundColor: bgColor,
              opacity: 1.0,
              zoom: 1.0,
            },
            condition: DEFAULT_CARD_CONDITION,
            label: DEFAULT_CARD_LABEL,
            collapsedList: [],
            date,
            _id: `note/${note.settings.currentNoteId}/${cardId}`,
          };

          note
            .createCardSketch(newUrl, cardSketch, true)
            .then(() => {
              return note.cardCollection.get(getCardIdFromUrl(newUrl));
            })
            .then(cardBody => {
              createCardWindow(note, newUrl, cardBody!, cardSketch);
            })
            // createCardSketch throws error when the same sketch exists.
            .catch(() => {});
          // Update zOrder of target note asynchronously
          if (note.settings.saveZOrder) {
            const noteId = note.settings.currentNoteId;
            const zOrder = [...noteStore.getState().get(noteId)!.zOrder];
            if (!zOrder.includes(newUrl)) {
              zOrder.push(newUrl);
              noteStore.dispatch(
                noteZOrderUpdateCreator(note, noteId, zOrder, 'local', undefined, true)
              );
            }
          }
        }
        break;
      }
    }
  });
};
