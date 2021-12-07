/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { BrowserWindow, MenuItemConstructorOptions } from 'electron';
import contextMenu from 'electron-context-menu';
import { cardColors, ColorName } from '../modules_common/color';
import { Geometry, ICard } from '../modules_common/types';
import { getCurrentDateAndTime } from '../modules_common/utils';
import {
  getZIndexOfBottomCard,
  setZIndexOfBottomCard,
  setZIndexOfTopCard,
} from './card_zindex';
import { cacheOfCard } from './card_cache';
import { MESSAGE } from './messages';
import { INote } from './note_types';
import { noteStore } from './note_store';

/**
 * Context Menu
 */
export const setContextMenu = (note: INote, card: ICard) => {
  const setColor = (name: ColorName) => {
    return {
      label: MESSAGE(name),
      click: () => {
        if (name === 'transparent') {
          card.window.webContents.send('change-card-color', cardColors[name], 0.0);
        }
        else {
          card.window.webContents.send('change-card-color', cardColors[name]);
        }
      },
    };
  };

  const moveCardToNote = (noteId: string) => {
    card.moveToNote(noteId);
  };

  const copyCardToNote = (noteId: string) => {
    card.copyToNote(noteId);
  };

  const moveToNotes: MenuItemConstructorOptions[] = [...noteStore.getState().values()]
    .sort((a, b) => {
      if (a.name > b.name) return 1;
      else if (a.name < b.name) return -1;
      return 0;
    })
    .reduce((result, noteProp) => {
      if (noteProp._id !== note.settings.currentNoteId) {
        result.push({
          label: `${noteProp.name}`,
          click: () => {
            moveCardToNote(noteProp._id);
          },
        });
      }
      return result;
    }, [] as MenuItemConstructorOptions[]);

  const copyToNotes: MenuItemConstructorOptions[] = [...noteStore.getState().values()]
    .sort((a, b) => {
      if (a.name > b.name) return 1;
      else if (a.name < b.name) return -1;
      return 0;
    })
    .reduce((result, noteProp) => {
      if (noteProp._id !== note.settings.currentNoteId) {
        result.push({
          label: `${noteProp.name}`,
          click: () => {
            copyCardToNote(noteProp._id);
          },
        });
      }
      return result;
    }, [] as MenuItemConstructorOptions[]);

  const dispose = contextMenu({
    window: card.window,
    showSaveImageAs: true,
    showInspectElement: false,
    menu: actions => [
      actions.searchWithGoogle({}),
      actions.separator(),
      {
        label: MESSAGE('cut'),
        role: 'cut',
      },
      {
        label: MESSAGE('copy'),
        role: 'copy',
      },
      {
        label: MESSAGE('paste'),
        role: 'paste',
      },
      {
        label: MESSAGE('pasteAndMatchStyle'),
        role: 'pasteAndMatchStyle',
      },
      actions.separator(),
      actions.saveImageAs({}),
      actions.separator(),
      actions.copyLink({}),
      actions.separator(),
    ],
    prepend: (defaultActions, params, browserWindow) => {
      const menus: MenuItemConstructorOptions[] = [
        {
          label: card.sketch.condition.label.labeled
            ? MESSAGE('transformFromLabel')
            : MESSAGE('transformToLabel'),
          click: () => {
            if (card.sketch.condition.label.labeled) {
              card.window.webContents.send('transform-from-label');
            }
            else {
              card.window.webContents.send('transform-to-label');
            }
            resetContextMenu();
          },
        },
        {
          label: MESSAGE('noteMove'),
          submenu: [...moveToNotes],
        },
        {
          label: MESSAGE('noteCopy'),
          submenu: [...copyToNotes],
        },
        {
          label: MESSAGE('zoomIn'),
          click: () => {
            card.window.webContents.send('zoom-in');
          },
        },
        {
          label: MESSAGE('zoomOut'),
          click: () => {
            card.window.webContents.send('zoom-out');
          },
        },
        {
          label: MESSAGE('sendToBack'),
          click: () => {
            // console.log([...cacheOfCard.values()].map(myCard => myCard.geometry.z));

            // Database Update
            if (card.sketch.geometry.z === getZIndexOfBottomCard()) {
              return card.sketch.geometry.z;
            }

            const zIndex = getZIndexOfBottomCard() - 1;
            // console.debug(`new zIndex: ${zIndex}`);
            const newGeom = JSON.parse(JSON.stringify(card.sketch.geometry)) as Geometry;
            newGeom.z = zIndex;

            // Async
            const modifiedDate = getCurrentDateAndTime();
            note.updateCardGeometry(card.url, newGeom, modifiedDate);

            // console.log([...cacheOfCard.values()].map(myCard => myCard.geometry.z));

            const backToFront: ICard[] = [...cacheOfCard.values()].sort((a, b) => {
              if (a.sketch.geometry.z > b.sketch.geometry.z) return 1;
              if (a.sketch.geometry.z < b.sketch.geometry.z) return -1;
              return 0;
            });
            setZIndexOfTopCard(backToFront[backToFront.length - 1].sketch.geometry.z);
            setZIndexOfBottomCard(backToFront[0].sketch.geometry.z);
            backToFront.forEach(myCard => {
              if (myCard.window && !myCard.window.isDestroyed()) {
                myCard!.suppressFocusEventOnce = true;
                myCard!.window.focus();
              }
            });

            card.window.webContents.send('send-to-back', zIndex, modifiedDate);
          },
        },
        {
          label: card.sketch.condition.locked ? MESSAGE('unlockCard') : MESSAGE('lockCard'),
          click: () => {
            card.sketch.condition.locked = !card.sketch.condition.locked;
            card.window.webContents.send('set-lock', card.sketch.condition.locked);
            resetContextMenu();
          },
        },
      ];

      if (params.dictionarySuggestions.length > 0) {
        menus.push({ type: 'separator' });
      }
      // Add each spelling suggestion
      for (const suggestion of params.dictionarySuggestions) {
        menus.push({
          label: suggestion,
          click: () =>
            (browserWindow as BrowserWindow).webContents.replaceMisspelling(suggestion),
        });
      }

      // Allow users to add the misspelled word to the dictionary
      if (params.misspelledWord) {
        menus.push({
          label: MESSAGE('addToDictionary'),
          click: () =>
            (browserWindow as BrowserWindow).webContents.session.addWordToSpellCheckerDictionary(
              params.misspelledWord
            ),
        });
        menus.push({ type: 'separator' });
      }
      return menus;
    },
    append: () => [
      setColor('yellow'),
      setColor('red'),
      setColor('green'),
      setColor('blue'),
      setColor('orange'),
      setColor('purple'),
      setColor('white'),
      setColor('gray'),
      setColor('transparent'),
    ],
  });

  const resetContextMenu = () => {
    // @ts-ignore
    dispose();
    setContextMenu(note, card);
  };

  return resetContextMenu;
};
