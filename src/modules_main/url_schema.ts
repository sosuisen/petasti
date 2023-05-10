/* eslint-disable max-depth */
import { shell } from 'electron';
import { APP_SCHEME } from '../modules_common/const';
import { cacheOfCard, closeAllCards } from './card_cache';
import { emitter } from './event';
import { INote } from './note_types';
import { closeSettings } from './settings';
import { getUrlFromSketchId, isLabelOpened } from '../modules_common/utils';

let note: INote;

export const initializeUrlSchema = (store: INote) => {
  note = store;
};

// eslint-disable-next-line complexity
export function openURL (url: string) {
  if (url.startsWith(APP_SCHEME + '://')) {
    const rexNote = new RegExp(`^${APP_SCHEME}:\\/\\/[^/]+?\\/note/(n.+?)$`); // petasti://local/note/noteID
    const resultNote = url.match(rexNote);
    if (resultNote && resultNote.length === 2) {
      // URL is note
      const noteId = resultNote[1];
      if (noteId !== note.settings.currentNoteId) {
        closeSettings();
        note.closeDashboard();
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
      return;
    }

    const rexSketch = new RegExp(`^${APP_SCHEME}:\\/\\/[^/]+?\\/(n[^/]+?)\\/(c.+?)$`); // petasti://local/noteId/noteID
    const resultSketch = url.match(rexSketch);
    if (resultSketch && resultSketch.length >= 2) {
      // URL is note
      const noteId = resultSketch[1];
      const cardId = resultSketch[2];
      if (noteId !== note.settings.currentNoteId) {
        closeSettings();
        note.closeDashboard();
        if (cacheOfCard.size === 0) {
          emitter.emit('change-note', noteId);
        }
        else {
          note.changingToNoteId = noteId;
          note.changengToNoteFocusedSketchId = noteId + '/' + cardId;
          try {
            closeAllCards(note);
          } catch (e) {
            console.error(e);
          }
          // wait 'window-all-closed' event
        }
      }
      else {
        // focus card
        const card = cacheOfCard.get(getUrlFromSketchId(noteId + '/' + cardId));
        if (card) {
          if (!card.window || card.window.isDestroyed() || !card.window.webContents) return;
          card.focus();
          if (isLabelOpened(card.sketch.label.status)) {
            card.window.webContents.send('transform-from-label');
          }
        }
      }
    }
  }
  else {
    shell.openExternal(url);
  }
}
