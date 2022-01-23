/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { cacheOfCard } from './card_cache';
/**
 * Manage z-index
 */
// let zIndexOfTopCard: number;
// let zIndexOfBottomCard: number;
/*
export const setZIndexOfTopCard = (zIndex: number) => {
  zIndexOfTopCard = zIndex;
};
*/
export const getZIndexOfTopCard = (): number => {
  console.log('getZIndexOfTopCard');
  const backToFront = [...cacheOfCard.values()].sort((a, b) => {
    /*
    if (a.sketch.geometry === undefined) {
      console.log('# geometry undefined: ' + JSON.stringify(a.sketch));
      return 0;
    }
    if (b.sketch.geometry === undefined) {
      console.log('# geometry undefined: ' + JSON.stringify(b.sketch));
      return 0;
    }
    */
    if (a.sketch.geometry.z > b.sketch.geometry.z) return 1;
    if (a.sketch.geometry.z < b.sketch.geometry.z) return -1;
    return 0;
  });
  if (backToFront.length > 0) {
    return backToFront[backToFront.length - 1].sketch.geometry.z;
  }
  return 0;

  // return zIndexOfTopCard;
};
/*
export const setZIndexOfBottomCard = (zIndex: number) => {
  zIndexOfBottomCard = zIndex;
};
*/
export const getZIndexOfBottomCard = (): number => {
  console.log('getZIndexOfBottomCard');
  const backToFront = [...cacheOfCard.values()].sort((a, b) => {
    /*
    if (a.sketch.geometry === undefined) {
      console.log('# geometry undefined: ' + JSON.stringify(a.sketch));
      return 0;
    }
    if (b.sketch.geometry === undefined) {
      console.log('# geometry undefined: ' + JSON.stringify(b.sketch));
      return 0;
    }
    */
    if (a.sketch.geometry.z > b.sketch.geometry.z) return 1;
    if (a.sketch.geometry.z < b.sketch.geometry.z) return -1;
    return 0;
  });
  if (backToFront.length > 0) {
    return backToFront[0].sketch.geometry.z;
  }
  return 0;

  //  return zIndexOfBottomCard;
};
