/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { BrowserWindow } from 'electron';

export type CartaDate = {
  createdDate: string;
  modifiedDate: string;
};

export type Geometry = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
};

export type Geometry2D = Omit<Geometry, 'z'>;
export type GeometryXY = Omit<Geometry, 'z' | 'width' | 'height'>;

/**
 * CardStyle
 * Visual style of a card
 */
export type CardStyle = {
  uiColor: string;
  backgroundColor: string;
  opacity: number;
  zoom: number;
};

/**
 * CardCondition
 * Serializable condition of a card
 */
export type CardCondition = {
  locked: boolean;
};

export type CardProp = {
  version: string;
  url: string;
  type: string;
  user: string;
  geometry: Geometry;
  style: CardStyle;
  condition: CardCondition;
  date: CartaDate;
  _body: string;
};

export type CardPropStatus = CardProp & { status: CardStatus };

export type CardBody = {
  version: string;
  type: string;
  user: string;
  date: CartaDate;
  _body: string;
  _id: string;
};

export type CardDoc = {
  geometry: Geometry;
  style: CardStyle;
  condition: CardCondition;
  _id: string;
};

export type NoteProp = {
  _id: string;
  name: string;
  user: string;
  date: CartaDate;

  updatedTime?: string; // only for redux-thunk
};

export type CardStatus = 'Focused' | 'Blurred';

export type SavingTarget = 'BodyOnly' | 'PropertyOnly' | 'Card';

export type Task = {
  prop: CardPropStatus;
  type: 'Save' | 'DeleteCard' | 'DeleteCard';
  target?: SavingTarget;
};

export interface ICard {
  version: string;
  url: string;
  type: string;
  user: string;
  geometry: Geometry;
  style: CardStyle;
  condition: CardCondition;
  date: CartaDate;

  _body: string;

  status: CardStatus;

  removeWindowListenersExceptClosedEvent: () => void;
  removeWindowListeners: () => void;
  window: BrowserWindow;

  resetContextMenu: () => void;

  toObject: () => CardProp;

  suppressFocusEventOnce: boolean;
  suppressBlurEventOnce: boolean;

  renderingCompleted: boolean;
  recaptureGlobalFocusEventAfterLocalFocusEvent: boolean;
}

export type CardMap = Map<string, ICard>;
