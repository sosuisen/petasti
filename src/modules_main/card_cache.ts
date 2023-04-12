/**
 * Petasti
 * © 2022 Hidekazu Kubota
 */
import { isContext } from 'vm';
import {
  Geometry,
  Geometry2D,
  GeometryXY,
  ICard,
  RelativePositionOfCardUrl,
} from '../modules_common/types';
import { isLabelOpened } from '../modules_common/utils';
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
    .updateNoteZOrder()
    .then(() => {
      // Remove listeners firstly to avoid focus another card in closing process
      cacheOfCard.forEach(card => card.removeWindowListenersExceptClosedEvent());
      cacheOfCard.forEach(card => card.window?.webContents.send('card-close'));
    })
    .catch(e => {
      throw e;
    });
};
