/* eslint-disable max-depth */
import { shell } from 'electron';
import { APP_SCHEME } from '../modules_common/const';
import { cacheOfCard, closeAllCards } from './card_cache';
import { emitter } from './event';
import { INote } from './note_types';
import { closeSettings } from './settings';
import {
  bookRegExp,
  getSketchUrlFromSketchId,
  isLabelOpened,
} from '../modules_common/utils';
import { noteStore } from './note_store';

let note: INote;

export const initializeUrlSchema = (store: INote) => {
  note = store;
};

// eslint-disable-next-line complexity
export function openURL (url: string) {
  if (url.startsWith(APP_SCHEME + '://')) {
    const rexNote = new RegExp(`^${APP_SCHEME}:\\/\\/.+?\\/${bookRegExp}\\/(n.+?)$`); // petasti://local/b001/noteID
    const resultNote = url.match(rexNote);
    if (resultNote && resultNote.length === 2) {
      // URL is note
      const noteId = resultNote[1];
      if (noteStore.getState().get(noteId) === undefined) {
        return;
      }
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

    const rexView = new RegExp(
      `^${APP_SCHEME}:\\/\\/.+?\\/${bookRegExp}\\/(n[^/]+?)\\/(c.+?)$`
    ); // petasti://local/001/noteID/cardID

    const resultView = url.match(rexView);
    if (resultView && resultView.length === 3) {
      // URL is view
      const noteId = resultView[1];
      const cardId = resultView[2];
      if (noteId !== note.settings.currentNoteId) {
        closeSettings();
        note.closeDashboard();
        if (cacheOfCard.size === 0) {
          emitter.emit('change-note', noteId);
        }
        else {
          note.changingToNoteId = noteId;
          note.changingToNoteFocusedSketchId = noteId + '/' + cardId;
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
        const card = cacheOfCard.get(getSketchUrlFromSketchId(noteId + '/' + cardId));
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
