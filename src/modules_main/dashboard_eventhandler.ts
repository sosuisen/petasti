/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { ipcMain } from 'electron';
import { DatabaseCommand } from '../modules_common/db.types';
import { INote } from './note_types';
import { dashboard } from './dashboard';

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
    }
  });
};
