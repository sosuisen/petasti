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

const openCard = async (cardId: string) => {
  const card = await note.cardCollection.get(cardId);
  if (card) {
    if (!note.openDashboardProxy(note, card)) {
      note.dashboardProxy().webContents.send('open-card', card);
    }
  }
};

// eslint-disable-next-line complexity
export async function openURL (url: string) {
  if (url.startsWith(APP_SCHEME + '://')) {
    const rexNote = new RegExp(`^${APP_SCHEME}:\\/\\/.+?\\/${bookRegExp}\\/(n[^/]+?)$`); // petasti://local/b001/noteID
    const resultNote = url.match(rexNote);
    if (resultNote && resultNote.length === 2) {
      // URL is note
      const noteId = resultNote[1];
      if (noteStore.getState().get(noteId) === undefined) {
        return;
      }
      if (noteId !== note.settings.currentNoteId) {
        closeSettings();
        note.closeDashboardProxy(false);
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
      // URL is CardView
      const noteId = resultView[1];
      const cardId = resultView[2];
      if (noteId !== note.settings.currentNoteId) {
        // another space
        const doc = await note.noteCollection.get(noteId + '/' + cardId);
        if (doc) {
          // CardView exists
          closeSettings();
          note.closeDashboardProxy();
          if (cacheOfCard.size === 0) {
            emitter.emit('change-note', noteId);
          }
          else {
            // eslint-disable-next-line require-atomic-updates
            note.changingToNoteId = noteId;
            // eslint-disable-next-line require-atomic-updates
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
          // view does note exist.
          // try to open card
          openCard(cardId);
        }
      }
      else {
        // current space
        const card = cacheOfCard.get(getSketchUrlFromSketchId(noteId + '/' + cardId));
        if (card) {
          // view exists in current space
          if (!card.window || card.window.isDestroyed() || !card.window.webContents) return;
          card.focus();
          if (isLabelOpened(card.sketch.label.status)) {
            card.window.webContents.send('transform-from-label');
          }
        }
        else {
          // view does note exist.
          // try to open card
          openCard(cardId);
        }
      }
    }

    const rexCard = new RegExp(`^${APP_SCHEME}:\\/\\/.+?\\/${bookRegExp}\\/(c.+?)$`); // petasti://local/001/noteID/cardID

    const resultCard = url.match(rexCard);
    if (resultCard && resultCard.length === 2) {
      // URL is CardView
      const cardId = resultCard[1];
      openCard(cardId);
    }
  }
  else {
    shell.openExternal(url);
  }
}
