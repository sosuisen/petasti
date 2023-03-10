/**
 * TreeStickies
 * © 2022 Hidekazu Kubota
 */
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

const calcCentroid = (geometry: Geometry2D): GeometryXY => {
  return { x: geometry.x + geometry.width / 2, y: geometry.y + geometry.height / 2 };
};

const getActualGeometry2D = (card: ICard): Geometry2D => {
  if (isLabelOpened(card.sketch.label.status)) {
    return {
      x: card.sketch.label.x!,
      y: card.sketch.label.y!,
      width: card.sketch.label.width!,
      height: card.sketch.label.height!,
    };
  }
  return {
    x: card.sketch.geometry.x,
    y: card.sketch.geometry.y,
    width: card.sketch.geometry.width,
    height: card.sketch.geometry.height,
  };
};

export const calcRelativePositionOfCardUrl = (
  targetCardUrl: string
): RelativePositionOfCardUrl => {
  // Up, down, left, right are the terms used
  // in the coordinate system with the Y-axis pointing upward.
  // Counterclockwise angles from unit vector(1,0) are:
  //  up: from PI/4 to PI*3/4
  //  left: from PI*3/4 to PI, from -PI*3/4 to -PI
  //  down: from -PI*3/4 to -PI/4
  //  right: from 0 to PI*/4, from -PI/4 to 0
  const relPos: RelativePositionOfCardUrl = {
    up: [],
    down: [],
    left: [],
    right: [],
  };
  const targetCard = cacheOfCard.get(targetCardUrl);
  if (!targetCard) return relPos;
  const targetCentroid = calcCentroid(getActualGeometry2D(targetCard));
  const unitVector = { x: 1, y: 0 };
  for (const card of cacheOfCard.values()) {
    if (card === targetCard) continue;
    const currentCentroid = calcCentroid(getActualGeometry2D(card));
    const targetVector = {
      x: currentCentroid.x - targetCentroid.x,
      y: currentCentroid.y - targetCentroid.y,
    };
    const targetLength = Math.sqrt(
      Math.pow(targetVector.x, 2) + Math.pow(targetVector.y, 2)
    );
    if (targetLength === 0) {
      relPos.right.push({ url: card.url, distance: 0, radian: 0 });
      continue;
    }
    const innerProduct = calcInnerProduct(
      unitVector.x,
      unitVector.y,
      targetVector.x,
      targetVector.y
    );
    const cos = innerProduct / targetLength;
    let rad = Math.acos(cos);
    const outerProduct = calcOuterProduct(
      unitVector.x,
      unitVector.y,
      targetVector.x,
      targetVector.y
    );
    if (outerProduct > 0) rad = -rad;
    if (rad > -Math.PI / 4 && rad <= Math.PI / 4) {
      relPos.right.push({ url: card.url, distance: targetLength, radian: rad });
    }
    else if (rad > Math.PI / 4 && rad <= (Math.PI * 3) / 4) {
      relPos.up.push({ url: card.url, distance: targetLength, radian: rad });
    }
    if (rad > (Math.PI * 3) / 4 || rad <= (-Math.PI * 3) / 4) {
      relPos.left.push({ url: card.url, distance: targetLength, radian: rad });
    }
    if (rad > (-Math.PI * 3) / 4 && rad <= -Math.PI / 4) {
      relPos.down.push({ url: card.url, distance: targetLength, radian: rad });
    }
  }
  return relPos;
};
