/**
 * TreeStickies
 * © 2022 Hidekazu Kubota
 */
import { cacheOfCard } from './card_cache';
/**
 * Manage z-index
 */

export const getZIndexOfTopCard = (): number => {
  const backToFront = [...cacheOfCard.values()]
    .sort((a, b) => {
      if (a.sketch.geometry.z > b.sketch.geometry.z) return 1;
      if (a.sketch.geometry.z < b.sketch.geometry.z) return -1;
      return 0;
    })
    .filter(card => !card.isFake);
  if (backToFront.length > 0) {
    return backToFront.length - 1;
  }
  return 0;
};

export const getZIndexOfBottomCard = (): number => {
  // Always zero
  return 0;
  /*
  // console.log('getZIndexOfBottomCard');
  const backToFront = [...cacheOfCard.values()].sort((a, b) => {
    if (a.sketch.geometry.z > b.sketch.geometry.z) return 1;
    if (a.sketch.geometry.z < b.sketch.geometry.z) return -1;
    return 0;
  });
  if (backToFront.length > 0) {
    return backToFront[0].sketch.geometry.z;
  }
  return 0;
  */
};
