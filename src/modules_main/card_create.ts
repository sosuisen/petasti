/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { CardProp } from '../modules_common/types';
import { Card } from './card';
import { currentCardMap } from './card_map';
import { getZIndexOfTopCard } from './card_zindex';
import { INoteStore } from './note_store_types';

export const createCard = async (
  noteStore: INoteStore,
  partialCardProp: Partial<CardProp>
): Promise<void> => {
  // Overwrite z
  if (partialCardProp.geometry !== undefined) {
    partialCardProp.geometry.z = getZIndexOfTopCard() + 1;
  }
  const card = new Card(noteStore, partialCardProp);

  currentCardMap.set(card.url, card);

  const newCardProp = card.toObject();

  // Async
  noteStore.updateCardBody(newCardProp);

  // Sync
  await noteStore.updateCardDoc(newCardProp);

  await card.render();
  console.debug(`focus in createCard: ${card.url}`);
  card.window.focus();
};
