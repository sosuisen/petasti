import { Display, screen } from 'electron';
import {
  Geometry2D,
  GeometryXY,
  ICard,
  RelativePositionOfCardUrl,
} from '../modules_common/types';
import { isLabelOpened, sleep } from '../modules_common/utils';
import { cacheOfCard } from './card_cache';
import { playSound } from './sound';

/**
 * Calc relative positions
 */
const calcInnerProduct = (a: GeometryXY, b: GeometryXY) => {
  return a.x * b.x + a.y * b.y;
};

const calcOuterProduct = (a: GeometryXY, b: GeometryXY) => {
  return a.x * b.y - a.y * b.x;
};

const calcCentroid = (geometry: Geometry2D): GeometryXY => {
  return { x: geometry.x + geometry.width / 2, y: geometry.y + geometry.height / 2 };
};

// See http://www.fumiononaka.com/Business/html5/FN1312004.html
const getIntersection = (
  from0: GeometryXY,
  to0: GeometryXY,
  from1: GeometryXY,
  to1: GeometryXY
): GeometryXY | null => {
  // AC
  const vector0: GeometryXY = { x: to0.x - from0.x, y: to0.y - from0.y };
  // BD
  const vector1: GeometryXY = { x: to1.x - from1.x, y: to1.y - from1.y };
  // AB
  const vector2: GeometryXY = { x: from1.x - from0.x, y: from1.y - from0.y };
  // BC
  const vector3: GeometryXY = { x: to0.x - from1.x, y: to0.y - from1.y };
  // BD×AB
  const area0 = calcOuterProduct(vector1, vector2);
  // BD×BC
  const area1 = calcOuterProduct(vector1, vector3);
  // BD×AB + BD×BC
  const areaTotal = area0 + area1;
  if (Math.abs(areaTotal) >= 1) {
    // k = BD×AB / (BD×AB + BD×BC)
    const ratio = area0 / areaTotal;

    const intersection: GeometryXY = { x: 0, y: 0 };
    // x = ax + k×(cx - ax)
    intersection.x = from0.x + ratio * vector0.x;
    // y = ay + k×(cy - ay)
    intersection.y = from0.y + ratio * vector0.y;

    return intersection;
  }
  return null;
};

// See http://www.fumiononaka.com/Business/html5/FN1312004.html
const isCrossed = (
  from0: GeometryXY,
  to0: GeometryXY,
  from1: GeometryXY,
  to1: GeometryXY
) => {
  // BD
  const vector0: GeometryXY = { x: to1.x - from1.x, y: to1.y - from1.y };
  // BA
  const vector1: GeometryXY = { x: from0.x - from1.x, y: from0.y - from1.y };
  // BC
  const vector2: GeometryXY = { x: to0.x - from1.x, y: to0.y - from1.y };
  // (BD×BA)(BD×BC) > 0
  if (calcOuterProduct(vector0, vector1) * calcOuterProduct(vector0, vector2) > 0) {
    return false; // not crossed
  }
  // AC
  const vector3: GeometryXY = { x: to0.x - from0.x, y: to0.y - from0.y };
  // AB
  const vector4: GeometryXY = { x: from1.x - from0.x, y: from1.y - from0.y };
  // AD
  const vector5: GeometryXY = { x: to1.x - from0.x, y: to1.y - from0.y };
  // (AC×AB)(AC×AD) > 0
  if (calcOuterProduct(vector3, vector4) * calcOuterProduct(vector3, vector5) > 0) {
    return false; // not crossed
  }
  return true; // crossed
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

// eslint-disable-next-line complexity
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
  const targetGeometry = getActualGeometry2D(targetCard);
  const targetCentroid = calcCentroid(targetGeometry);
  const unitVector: GeometryXY = { x: 1, y: 0 };
  for (const card of cacheOfCard.values()) {
    if (card === targetCard) continue;
    const cardGeometry = getActualGeometry2D(card);
    const currentCentroid = calcCentroid(cardGeometry);
    const targetVector: GeometryXY = {
      x: currentCentroid.x - targetCentroid.x,
      y: currentCentroid.y - targetCentroid.y,
    };
    const targetLength = Math.sqrt(
      Math.pow(targetVector.x, 2) + Math.pow(targetVector.y, 2)
    );
    if (targetLength === 0) {
      relPos.right.push({
        url: card.url,
        distance: 0,
        radian: 0,
        centroidDistance: 0,
      });
      relPos.left.push({
        url: card.url,
        distance: 0,
        radian: 0,
        centroidDistance: 0,
      });
      relPos.up.push({
        url: card.url,
        distance: 0,
        radian: 0,
        centroidDistance: 0,
      });
      relPos.down.push({
        url: card.url,
        distance: 0,
        radian: 0,
        centroidDistance: 0,
      });
      continue;
    }
    const innerProduct = calcInnerProduct(unitVector, targetVector);
    const cos = innerProduct / targetLength;
    let rad = Math.acos(cos);
    const outerProduct = calcOuterProduct(unitVector, targetVector);
    if (outerProduct > 0) rad = -rad;

    let rightDistance = targetLength;
    let leftDistance = targetLength;
    let upDistance = targetLength;
    let downDistance = targetLength;

    let isLeft = false;
    let isRight = false;
    let isUp = false;
    let isDown = false;
    if (cardGeometry.x >= targetGeometry.x + targetGeometry.width) isRight = true;
    if (cardGeometry.x + cardGeometry.width <= targetGeometry.x) isLeft = true;
    if (cardGeometry.y >= targetGeometry.y + targetGeometry.height) isDown = true;
    if (cardGeometry.y + cardGeometry.height <= targetGeometry.y) isUp = true;

    if (rad > -Math.PI / 4 && rad <= Math.PI / 4) {
      if (isRight) {
        // Use shorter distance
        rightDistance = cardGeometry.x - (targetGeometry.x + targetGeometry.width);
      }
      isRight = true;
    }
    else if (rad > Math.PI / 4 && rad <= (Math.PI * 3) / 4) {
      if (isUp) {
        upDistance = targetGeometry.y - (cardGeometry.y + cardGeometry.height);
      }
      isUp = true;
    }
    else if (rad > (Math.PI * 3) / 4 || rad <= (-Math.PI * 3) / 4) {
      if (isLeft) {
        leftDistance = targetGeometry.x - (cardGeometry.x + cardGeometry.width);
      }
      isLeft = true;
    }
    else if (rad > (-Math.PI * 3) / 4 && rad <= -Math.PI / 4) {
      if (isDown) {
        downDistance = cardGeometry.y - (targetGeometry.y + targetGeometry.height);
      }
      isDown = true;
    }

    if (isRight) {
      // Adjust distance by angle
      // The greater the angle, the greater the distance.
      rightDistance *= Math.pow(1 + Math.abs(Math.sin(rad)), 4);
      relPos.right.push({
        url: card.url,
        distance: rightDistance,
        centroidDistance: targetLength,
        radian: rad,
      });
    }
    if (isLeft) {
      leftDistance *= Math.pow(1 + Math.abs(Math.sin(rad)), 4);
      relPos.left.push({
        url: card.url,
        distance: leftDistance,
        centroidDistance: targetLength,
        radian: rad,
      });
    }
    if (isUp) {
      upDistance *= Math.pow(1 + Math.abs(Math.cos(rad)), 4);
      relPos.up.push({
        url: card.url,
        distance: upDistance,
        centroidDistance: targetLength,
        radian: rad,
      });
    }
    if (isDown) {
      downDistance *= Math.pow(1 + Math.abs(Math.cos(rad)), 4);
      relPos.down.push({
        url: card.url,
        distance: downDistance,
        centroidDistance: targetLength,
        radian: rad,
      });
    }
  }
  return relPos;
};

export const moveCardOutsideFromTop = async (url: string) => {
  playSound('delete', 3);

  const card = cacheOfCard.get(url);
  if (card) {
    const bounds: Geometry2D = getActualGeometry2D(card);
    const display: Display = screen.getDisplayNearestPoint({
      x: bounds.x,
      y: bounds.y,
    });

    // Shrink
    await card.setRect(
      bounds.x + bounds.width / 4,
      bounds.y + bounds.height / 4,
      bounds.width / 2,
      bounds.height / 2,
      true
    );
    // Move upper
    await card.setRect(
      bounds.x + (bounds.width - bounds.width / 8) / 2,
      display.bounds.y - bounds.height / 4,
      bounds.width / 8,
      bounds.height / 8,
      true,
      400
    );
  }
};

export const moveCardOutsideFromBottom = async (url: string) => {
  playSound('drop', 3);

  const card = cacheOfCard.get(url);
  if (card) {
    const bounds: Geometry2D = getActualGeometry2D(card);
    const display: Display = screen.getDisplayNearestPoint({
      x: bounds.x,
      y: bounds.y,
    });

    // Bounds upper
    await card.setRect(bounds.x, bounds.y - 50, bounds.width, bounds.height, true);
    // Move lower
    await card.setRect(
      bounds.x,
      display.bounds.y + display.bounds.height,
      bounds.width,
      bounds.height,
      true,
      400
    );
  }
};

export const moveCardOutsideFromRightForCopy = async (url: string) => {
  playSound('move', 3);
  const card = cacheOfCard.get(url);
  if (card) {
    const bounds: Geometry2D = getActualGeometry2D(card);
    const display: Display = screen.getDisplayNearestPoint({
      x: bounds.x,
      y: bounds.y,
    });

    await card.setRect(bounds.x + 50, bounds.y, bounds.width, bounds.height, true, 300);
    await sleep(300);
    await card.setRect(
      display.bounds.x + display.bounds.width,
      bounds.y,
      bounds.width,
      bounds.height,
      true,
      400
    );
  }
};

export const moveCardOutsideFromRightForMove = async (url: string) => {
  playSound('move', 3);
  const card = cacheOfCard.get(url);
  if (card) {
    const bounds: Geometry2D = getActualGeometry2D(card);
    const display: Display = screen.getDisplayNearestPoint({
      x: bounds.x,
      y: bounds.y,
    });

    await card.setRect(bounds.x - 50, bounds.y, bounds.width, bounds.height, true);
    await card.setRect(
      display.bounds.x + display.bounds.width,
      bounds.y,
      bounds.width,
      bounds.height,
      true,
      400
    );
  }
};
