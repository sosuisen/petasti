/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { Display, ipcMain, screen } from 'electron';
import prompt from 'electron-prompt';
import { JsonDoc } from 'git-documentdb';
import { INote } from './note_types';
import { closeDashboard, dashboard } from './dashboard';
import { DashboardCommand } from '../modules_common/dashboard.types';
import { openURL } from './url_schema';
import { noteStore } from './note_store';
import { MESSAGE } from './messages';
import { cacheOfCard } from './card_cache';
import {
  getCardIdFromUrl,
  getCardUrl,
  getCurrentDateAndTime,
  getNoteIdFromUrl,
  getRandomInt,
  getSketchUrl,
  getSketchUrlFromSketchId,
} from '../modules_common/utils';
import { cardColors, ColorName } from '../modules_common/color';
import { CardSketch, Geometry, ZOrder } from '../modules_common/types';
import {
  DEFAULT_CARD_CONDITION,
  DEFAULT_CARD_LABEL,
  DIALOG_BUTTON,
} from '../modules_common/const';
import { createCardWindow } from './card';
import { noteZOrderUpdateCreator } from './note_action_creator';
import { showConfirmDialog } from './utils_main';
import { CardReference } from '../dashboard/dashboard_local.types';

/**
 * Create card
 */
let color = { ...cardColors };
// @ts-ignore
delete color.transparent;

export const addDashboardHandler = (note: INote) => {
  // eslint-disable-next-line complexity
  ipcMain.handle('dashboard', async (e, command: DashboardCommand) => {
    // eslint-disable-next-line default-case
    switch (command.command) {
      case 'dashboard-search-note-and-card': {
        const noteResults = note.noteCollection.search('noteprop', command.data);
        const cardResults = note.cardCollection.search('card', command.data);

        const noteDocs = (
          await Promise.all(noteResults.map(res => note.noteCollection.get(res.ref)))
        ).filter(n => n !== undefined);

        const cardDocs = (
          await Promise.all(cardResults.map(res => note.cardCollection.get(res.ref)))
        ).filter(c => c !== undefined);

        dashboard.webContents.send('search-result-note-and-card', noteDocs, cardDocs);

        break;
      }
      case 'dashboard-search-note': {
        const noteResults = note.noteCollection.search('noteprop', command.data);

        const noteDocs = await Promise.all(
          noteResults.map(res => note.noteCollection.get(res.ref))
        );

        dashboard.webContents.send('search-result-note', noteDocs, -1);

        break;
      }
      case 'dashboard-get-all-notes': {
        const noteDocs = [...noteStore.getState().values()].sort((a, b) => {
          if (a.name > b.name) return 1;
          else if (a.name < b.name) return -1;
          return 0;
        });

        const currentNoteProp = noteStore.getState().get(note.settings.currentNoteId)!;
        const currentIndex = noteDocs.indexOf(currentNoteProp);

        dashboard.webContents.send('search-result-note', noteDocs, currentIndex);

        break;
      }
      case 'dashboard-get-references': {
        const cardId = command.data;
        const promises: Promise<JsonDoc | undefined>[] = [];
        for (const noteProp of [...noteStore.getState().values()]) {
          const sketchId = noteProp._id + '/' + cardId;
          // eslint-disable-next-line no-await-in-loop
          promises.push(note.noteCollection.get(sketchId));
        }

        const refs: (CardReference | undefined)[] = (await Promise.all(promises))
          .filter(res => res !== undefined)
          .map(doc => {
            const url = getSketchUrlFromSketchId(doc!._id);
            const noteId = getNoteIdFromUrl(url);
            let noteName = noteStore.getState().get(noteId)?.name;
            if (noteName === undefined) noteName = '';
            return {
              noteName,
              url,
            };
          });
        if (refs.length === 0) {
          refs.push(undefined);
        }
        dashboard.webContents.send('get-references', refs);

        break;
      }
      case 'dashboard-change-note': {
        const url = command.url;
        openURL(url);
        break;
      }
      case 'dashboard-open-card': {
        const url = command.url;
        const cardProp = await note.cardCollection.get(getCardIdFromUrl(url));
        if (cardProp) {
          dashboard.webContents.send('open-card', cardProp);
        }
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

        const currentIndex = noteDocs.indexOf(newNoteProp);

        dashboard.webContents.send('search-result-note', noteDocs, currentIndex);

        break;
      }
      case 'dashboard-clone-cards': {
        const searchResults = command.data;

        if (searchResults.length > 1) {
          const confirmResult = showConfirmDialog(
            dashboard,
            'question',
            ['btnOK', 'btnCancel'],
            'cloneCardsConfirmation'
          );

          if (confirmResult !== DIALOG_BUTTON.ok) {
            return;
          }
        }

        let zOrder: ZOrder;
        if (note.settings.saveZOrder) {
          zOrder = [...noteStore.getState().get(note.settings.currentNoteId)!.zOrder];
        }

        for (const result of searchResults) {
          const cardId = getCardIdFromUrl(result.url);

          const newUrl = getSketchUrl(note.settings.currentNoteId, cardId);
          if (cacheOfCard.get(newUrl)) {
            continue;
          }

          // eslint-disable-next-line no-await-in-loop
          const cardBody = await note.cardCollection.get(getCardIdFromUrl(newUrl));
          if (!cardBody) continue;

          const geometry: Geometry = {
            x: 20,
            y: 20,
            z: 0,
            width: 250,
            height: 250,
          };

          const display: Display = screen.getDisplayNearestPoint({ x: 1, y: 1 });
          const rect = {
            width: display.bounds.width,
            height: display.bounds.height,
          };
          if (searchResults.length < 10) {
            geometry.x += getRandomInt(30, rect.width / 2);
            geometry.y += getRandomInt(30, rect.height / 2);
          }
          else {
            geometry.x += getRandomInt(30, (rect.width * 2) / 3);
            geometry.y += getRandomInt(30, (rect.height * 2) / 3);
          }
          if (cardBody._body.length > 300) {
            geometry.width += getRandomInt(30, 100);
            geometry.height += getRandomInt(30, 100);
          }

          let colorList = Object.entries(color);
          if (colorList.length === 0) {
            color = { ...cardColors };
            // @ts-ignore
            delete color.transparent;
            colorList = Object.entries(color);
          }
          const newColor: ColorName = colorList[
            getRandomInt(0, colorList.length)
          ][0] as ColorName;
          delete color[newColor];

          const current = getCurrentDateAndTime();
          const date = {
            createdDate: current,
            modifiedDate: current,
          };

          const _id = `note/${note.settings.currentNoteId}/${cardId}`;

          const cardSketch: CardSketch = {
            geometry,
            style: {
              uiColor: cardColors[newColor],
              backgroundColor: cardColors[newColor],
              opacity: 1.0,
              zoom: 1.0,
            },
            condition: DEFAULT_CARD_CONDITION,
            label: DEFAULT_CARD_LABEL,
            collapsedList: [],
            date,
            _id,
          };

          // eslint-disable-next-line no-await-in-loop
          await note.createCardSketch(newUrl, cardSketch, true);

          // eslint-disable-next-line no-await-in-loop
          await createCardWindow(note, newUrl, cardBody!, cardSketch);

          // Update zOrder of target note asynchronously

          if (note.settings.saveZOrder) {
            if (!zOrder!.includes(newUrl)) {
              zOrder!.push(newUrl);
            }
          }
        }

        if (note.settings.saveZOrder) {
          noteStore.dispatch(
            noteZOrderUpdateCreator(
              note,
              note.settings.currentNoteId,
              zOrder!,
              'local',
              undefined,
              true
            )
          );
        }

        break;
      }
      case 'dashboard-close': {
        closeDashboard(false);
        break;
      }
    }
  });
};
