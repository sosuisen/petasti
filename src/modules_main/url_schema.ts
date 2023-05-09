import { shell } from 'electron';
import { APP_SCHEME } from '../modules_common/const';
import { cacheOfCard, closeAllCards } from './card_cache';
import { emitter } from './event';
import { INote } from './note_types';
import { closeSettings } from './settings';
import { closeDashboard } from './dashboard';

let note: INote;

export const initializeUrlSchema = (store: INote) => {
  note = store;
};

export function openURL (url: string) {
  if (url.startsWith(APP_SCHEME + '://')) {
    const rexNote = new RegExp(`^${APP_SCHEME}:\\/\\/[^/]+?\\/note/(n.+?)$`); // petasti://local/note/noteID
    const resultNote = url.match(rexNote);
    if (resultNote && resultNote.length === 2) {
      // URL is note
      const noteId = resultNote[1];
      if (noteId !== note.settings.currentNoteId) {
        closeSettings();
        closeDashboard();
        if (cacheOfCard.size === 0) {
          emitter.emit('change-note', noteId);
        }
        else {
          note.changingToNoteId = noteId;
          // eslint-disable-next-line max-depth
          try {
            closeAllCards(note);
          } catch (e) {
            console.error(e);
          }
          // wait 'window-all-closed' event
        }
      }
    }
  }
  else {
    shell.openExternal(url);
  }
}
