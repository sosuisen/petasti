/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { Card, currentCardMap, setZIndexOfBottomCard, setZIndexOfTopCard } from './card';
import { noteStore } from './note_store';

/**
 * init
 *
 * @remarks
 * init() depends on note_store.ts and card.ts.
 * Apart init.ts from them to avoid dependency cycle.
 */
export const initNotebook = async () => {
  // load workspaces
  const cardProps = await noteStore.loadNotebook();

  const renderers: Promise<void>[] = [];
  cardProps.forEach(cardProp => {
    const card = new Card(cardProp);
    currentCardMap.set(cardProp.url, card);
    renderers.push(card.render());
  });
  await Promise.all(renderers).catch(e => {
    console.error(`Error while rendering cards in ready event: ${e.message}`);
  });

  const backToFront = [...currentCardMap.values()].sort((a, b) => {
    if (a.geometry.z > b.geometry.z) return 1;
    else if (a.geometry.z < b.geometry.z) return -1;
    return 0;
  });
  if (currentCardMap.size > 0) {
    setZIndexOfTopCard(backToFront[backToFront.length - 1].geometry.z);
    setZIndexOfBottomCard(backToFront[0].geometry.z);
  }
  backToFront.forEach(card => {
    if (card.window && !card.window.isDestroyed()) {
      card.window.moveTop();
    }
  });

  const size = backToFront.length;
  console.debug(`Completed to load ${size} cards`);
};
