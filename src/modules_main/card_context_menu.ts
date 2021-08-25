/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { MenuItemConstructorOptions } from 'electron';
import contextMenu from 'electron-context-menu';
import { cardColors, ColorName } from '../modules_common/color';
import { APP_SCHEME } from '../modules_common/const';
import { CardProp, ICard } from '../modules_common/types';
import { getCardIdFromUrl } from '../modules_common/utils';
import {
  getZIndexOfBottomCard,
  setZIndexOfBottomCard,
  setZIndexOfTopCard,
} from './card_zindex';
import { currentCardMap } from './card_map';
import { MESSAGE } from './messages';
import { INote } from './note_types';

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

  const moveCardToNote = async (noteId: string) => {
    const newCardProp: CardProp = card.toObject();
    newCardProp.url = `${APP_SCHEME}://local/${noteId}/${getCardIdFromUrl(card.url)}`;
    // Overwrite z
    newCardProp.geometry.z = (await note.getZIndexOfTopCard(noteId)) + 1;

    await note.updateCardDoc(newCardProp);

    await note.deleteCard(card.url);
  };

  const copyCardToNote = async (noteId: string) => {
    const newCardProp: CardProp = card.toObject();
    newCardProp.url = `${APP_SCHEME}://local/${noteId}/${getCardIdFromUrl(card.url)}`;
    // Overwrite z
    newCardProp.geometry.z = (await note.getZIndexOfTopCard(noteId)) + 1;

    await note.updateCardDoc(newCardProp);
  };

  const moveToNotes: MenuItemConstructorOptions[] = [...note.notePropMap.values()]
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

  const copyToNotes: MenuItemConstructorOptions[] = [...note.notePropMap.values()]
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
    prepend: () => [
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
          const cardProp = card.toObject();

          // console.log([...currentCardMap.values()].map(myCard => myCard.geometry.z));

          // Database Update
          if (card.geometry.z === getZIndexOfBottomCard()) {
            return cardProp.geometry.z;
          }

          const zIndex = getZIndexOfBottomCard() - 1;
          // console.debug(`new zIndex: ${zIndex}`);

          // Async
          note.updateCardDoc(cardProp);

          // Update card
          card.geometry.z = zIndex;

          // console.log([...currentCardMap.values()].map(myCard => myCard.geometry.z));

          const backToFront: ICard[] = [...currentCardMap.values()].sort((a, b) => {
            if (a.geometry.z > b.geometry.z) return 1;
            if (a.geometry.z < b.geometry.z) return -1;
            return 0;
          });
          setZIndexOfTopCard(backToFront[backToFront.length - 1].geometry.z);
          setZIndexOfBottomCard(backToFront[0].geometry.z);
          backToFront.forEach(myCard => {
            if (myCard.window && !myCard.window.isDestroyed()) {
              myCard!.suppressFocusEventOnce = true;
              myCard!.window.focus();
            }
          });

          card.window.webContents.send('send-to-back', zIndex);
        },
      },
      {
        label: card.condition.locked ? MESSAGE('unlockCard') : MESSAGE('lockCard'),
        click: () => {
          card.condition.locked = !card.condition.locked;
          card.window.webContents.send('set-lock', card.condition.locked);
          resetContextMenu();
        },
      },
    ],
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
