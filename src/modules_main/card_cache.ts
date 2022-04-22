/**
 * TreeStickies
 * © 2022 Hidekazu Kubota
 */
import { ICard } from '../modules_common/types';
import { INote } from './note_types';
/**
 * cacheOfCard
 *
 * @remarks
 * - key: sketchUrl
 * - value: Card
 */
export const cacheOfCard: Map<string, ICard> = new Map<string, ICard>(); // means { [sketchUrl: string]: ICard] }
export const closeAllCards = (note: INote) => {
  note
    .updateNoteZorder()
    .then(() => {
      // Remove listeners firstly to avoid focus another card in closing process
      cacheOfCard.forEach(card => card.removeWindowListenersExceptClosedEvent());
      cacheOfCard.forEach(card => card.window?.webContents.send('card-close'));
    })
    .catch(e => {
      throw e;
    });
};
