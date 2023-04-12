/**
 * Petasti
 * © 2022 Hidekazu Kubota
 */

import { CardStyle } from '../modules_common/types';
import { cardStore } from './card_store';
import { cardStyleUpdateCreator } from './card_action_creator';

export const saveCardColor = (bgColor: string, uiColor?: string, opacity = 1.0) => {
  if (uiColor === undefined) {
    uiColor = bgColor;
  }
  const newStyle: CardStyle = { ...cardStore.getState().sketch.style };
  newStyle.backgroundColor = bgColor;
  newStyle.uiColor = uiColor;
  newStyle.opacity = opacity;

  cardStore.dispatch(cardStyleUpdateCreator(newStyle));
};
