/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

/**
 * Manage z-index
 */
let zIndexOfTopCard: number;
let zIndexOfBottomCard: number;
export const setZIndexOfTopCard = (zIndex: number) => {
  zIndexOfTopCard = zIndex;
};
export const getZIndexOfTopCard = (): number => {
  return zIndexOfTopCard;
};
export const setZIndexOfBottomCard = (zIndex: number) => {
  zIndexOfBottomCard = zIndex;
};
export const getZIndexOfBottomCard = (): number => {
  return zIndexOfBottomCard;
};
