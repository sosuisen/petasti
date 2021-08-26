/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { CardProp } from '../modules_common/types';
import { Card } from './card';
import { currentCardMap } from './card_map';
import { getZIndexOfTopCard } from './card_zindex';
import { INote } from './note_types';

export const createCardWindow = async (
  note: INote,
  partialCardProp: Partial<CardProp>
): Promise<void> => {
  // Overwrite z
  if (partialCardProp.geometry !== undefined) {
    partialCardProp.geometry.z = getZIndexOfTopCard() + 1;
  }
  const card = new Card(note, partialCardProp);

  currentCardMap.set(card.url, card);

  const newCardProp = card.toObject();
  // Async
  note.updateCardBody(newCardProp);
  note.updateCardDoc(newCardProp);

  await card.render();
  console.debug(`focus in createCardWindow: ${card.url}`);
  card.window.focus();
};
