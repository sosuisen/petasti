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

/**
 * Calc relative positions
 */
const calcInnerProduct = (ax: number, ay: number, bx: number, by: number) => {
  return ax * bx + ay * by;
};

const calcOuterProduct = (ax: number, ay: number, bx: number, by: number) => {
  return ax * by - ay * bx;
};

const calcRelativePositions = (targetCard: ICard) => {
  // up: from PI/4 to PI*3/4
  // left: from PI*3/4 to PI*5/4
  // down: from PI*5/4 to PI*7/4
  // right: from 0 to PI*/4 and from PI*7/4 to PI*2
  const relPos = {
    up: [],
    down: [],
    left: [],
    right: [],
  };
  cacheOfCard.forEach(card => {
    calcCentroid(card.sketch.geometry);
    // counterclockwise angle from targetCard
    let rad = Math.acos(
      calcInnerProduct(
        targetCard.sketch.geometry.x,
        targetCard.sketch.geometry.y,
        card.sketch.geometry.x,
        card.sketch.geometry.y
      )
    );
    const outerProduct = calcOuterProduct(
      targetCard.sketch.geometry.x,
      targetCard.sketch.geometry.y,
      card.sketch.geometry.x,
      card.sketch.geometry.y
    );
    if (outerProduct < 0) rad = -rad;
  });
};
