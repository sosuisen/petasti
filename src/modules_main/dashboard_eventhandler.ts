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
    }
  });
};
