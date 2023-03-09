/**
 * TreeStickies
 * © 2022 Hidekazu Kubota
 */
import {
  BrowserWindow,
  clipboard,
  Display,
  ipcMain,
  MenuItemConstructorOptions,
  Rectangle,
  screen,
} from 'electron';
import contextMenu from 'electron-context-menu';
import { cardColors, ColorName } from '../modules_common/color';
import { CardBody, CardSketch, ICard } from '../modules_common/types';
import { getCurrentDateAndTime, isLabelOpened } from '../modules_common/utils';
import { getZIndexOfBottomCard } from './card_zindex';
import { cacheOfCard } from './card_cache';
import { MESSAGE } from './messages';
import { INote } from './note_types';
import { noteStore } from './note_store';
import {
  DEFAULT_CARD_GEOMETRY,
  MINIMUM_WINDOW_HEIGHT,
  MINIMUM_WINDOW_HEIGHT_OFFSET,
} from '../modules_common/const';
import { emitter } from './event';

/**
 * Context Menu
 */
export const setContextMenu = (note: INote, card: ICard) => {
  let resetContextMenu = () => { };

  const setColor = (name: ColorName) => {
    return {
      label: MESSAGE(name),
      click: () => {
        if (name === 'transparent') {
          card.window?.webContents.send('change-card-color', cardColors[name], 0.0);
        }
        else {
          card.window?.webContents.send('change-card-color', cardColors[name]);
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

  let submenuMoveToNotes: MenuItemConstructorOptions[] = [];
  const resetMoveToNotes = () => [...noteStore.getState().values()]
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
  submenuMoveToNotes = resetMoveToNotes();

  let submenuCopyToNotes: MenuItemConstructorOptions[] = [];
  const resetCopyToNotes = () => [...noteStore.getState().values()]
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
  submenuCopyToNotes = resetCopyToNotes();

  const createCardFromMarkdown = (
    markdown: string,
    left: number,
    right: number,
    top: number,
    bottom: number
  ) => {
    const moveToRect = note.calcVacantLand(card.sketch.geometry, {
      x: card.sketch.geometry.x + left,
      y: card.sketch.geometry.y + top,
      width: card.sketch.geometry.width,
      height: bottom - top,
    });
    const cardX = card.sketch.geometry.x + Math.round(left);
    const cardY = card.sketch.geometry.y + Math.round(top);

    const cardBody: Partial<CardBody> = {
      _body: markdown,
    };
    const cardSketch: Partial<CardSketch> = {
      geometry: {
        x: cardX,
        y: cardY,
        z: 0, // z will be overwritten in createCardWindow()
        width: moveToRect.width,
        height: moveToRect.height,
      },
      style: {
        uiColor: card.sketch.style.uiColor,
        backgroundColor: card.sketch.style.backgroundColor,
        opacity: card.sketch.style.opacity,
        zoom: card.sketch.style.zoom,
      },
    };

    emitter.emit('create-card', cardBody, cardSketch, moveToRect);
  };

  const createMenu = () => {
    return contextMenu({
      window: card.window,
      showSaveImageAs: true,
      showInspectElement: false,
      menu: actions => [
        actions.searchWithGoogle({}),
        actions.separator(),
        {
          label: MESSAGE('cut'),
          role: 'cut',
          visible: card.hasSelection && !isLabelOpened(card.sketch.label.status),
        },
        {
          label: MESSAGE('copy'),
          role: 'copy',
          visible: card.hasSelection && !isLabelOpened(card.sketch.label.status),
        },
        {
          label: MESSAGE('copyAsMarkdown'),
          click: () => {
            if (card.hasSelection) {
              card.window?.webContents.send('get-selected-markdown');
              ipcMain.handleOnce(
                'response-of-get-selected-markdown-' + encodeURIComponent(card.url),
                (event, markdown, startLeft, endRight, top, bottom) => {
                  clipboard.writeText(markdown);
                }
              );
            }
          },
          visible: card.hasSelection && !isLabelOpened(card.sketch.label.status),
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
            label:
              card.hasSelection && !isLabelOpened(card.sketch.label.status)
                ? MESSAGE('newCardFromSelection')
                : MESSAGE('newCard'),
            click: () => {
              if (card.hasSelection) {
                card.window?.webContents.send('get-selected-markdown');
                ipcMain.handleOnce(
                  'response-of-get-selected-markdown-' + encodeURIComponent(card.url),
                  (event, markdown, startLeft, endRight, top, bottom) => {
                    createCardFromMarkdown(markdown, startLeft, endRight, top, bottom + 50);
                    card.window?.webContents.send('delete-selection');
                  }
                );
              }
              else {
                createCardFromMarkdown(
                  '',
                  0,
                  DEFAULT_CARD_GEOMETRY.width,
                  0,
                  DEFAULT_CARD_GEOMETRY.height
                );
              }
            },
          },
          {
            label: isLabelOpened(card.sketch.label.status)
              ? MESSAGE('transformFromLabel')
              : MESSAGE('transformToLabel'),
            click: () => {
              if (isLabelOpened(card.sketch.label.status)) {
                card.window?.webContents.send('transform-from-label');
              }
              else {
                card.window?.webContents.send('transform-to-label');
              }
            },
          },
          {
            label: MESSAGE('noteMove'),
            submenu: submenuMoveToNotes,
          },
          {
            label: MESSAGE('noteCopy'),
            submenu: submenuCopyToNotes,
          },
          {
            label: MESSAGE('zoomIn'),
            click: () => {
              card.window?.webContents.send('zoom-in');
            },
          },
          {
            label: MESSAGE('zoomOut'),
            click: () => {
              card.window?.webContents.send('zoom-out');
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
              // const newGeom = JSON.parse(JSON.stringify(card.sketch.geometry)) as Geometry;
              // newGeom.z = zIndex;

              // Async
              const modifiedDate = getCurrentDateAndTime();
              note.updateCardZ(card.url, zIndex, modifiedDate);

              // console.log([...cacheOfCard.values()].map(myCard => myCard.geometry.z));

              const backToFront: ICard[] = [...cacheOfCard.values()].sort((a, b) => {
                if (a.sketch.geometry.z > b.sketch.geometry.z) return 1;
                if (a.sketch.geometry.z < b.sketch.geometry.z) return -1;
                return 0;
              });
              /*
            setZIndexOfTopCard(backToFront[backToFront.length - 1].sketch.geometry.z);
            setZIndexOfBottomCard(backToFront[0].sketch.geometry.z);
            */
              backToFront.forEach(myCard => {
                if (myCard.window && !myCard.window.isDestroyed()) {
                  myCard!.suppressFocusEventOnce = true;
                  myCard!.focus();
                }
              });

              card.window?.webContents.send('send-to-back', zIndex, modifiedDate);
            },
          },
          /*
        {
          label: card.sketch.condition.locked ? MESSAGE('unlockCard') : MESSAGE('lockCard'),
          click: () => {
            card.sketch.condition.locked = !card.sketch.condition.locked;
            card.window.webContents.send('set-lock', card.sketch.condition.locked);
            resetContextMenu();
          },
        },
        */
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
  };

  const dispose = createMenu();

  resetContextMenu = () => {
    submenuMoveToNotes = resetMoveToNotes();
    submenuCopyToNotes = resetCopyToNotes();
  };

  return [resetContextMenu, dispose];
};
