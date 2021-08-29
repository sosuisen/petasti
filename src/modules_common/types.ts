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

export type CardBody = {
  version: string;
  type: string;
  user: string;
  date: CartaDate;
  _body: string;
  _id: string;
};

export type CardSketch = {
  geometry: Geometry;
  style: CardStyle;
  condition: CardCondition;
  date: CartaDate;
  _id: string;
};

export type NoteProp = {
  _id: string;
  name: string;
  user: string;
  date: CartaDate;

  updatedTime?: string; // only for redux-thunk
};

export type CardWorkState = {
  url: '';
  status: CardStatus;
};

export type CardStatus = 'Focused' | 'Blurred';

export type SavingTarget = 'BodyOnly' | 'SketchOnly' | 'Card';

export type Task = {
  prop: CardBody | CardSketch;
  type: 'Save' | 'DeleteCardSketch' | 'DeleteCard';
  target?: SavingTarget;
};

export type CardProperty = {
  url: string;
  body: CardBody;
  sketch: CardSketch;
};

export interface ICard {
  url: string;
  body: CardBody;
  sketch: CardSketch;
  status: CardStatus;

  removeWindowListenersExceptClosedEvent: () => void;
  removeWindowListeners: () => void;
  window: BrowserWindow;

  resetContextMenu: () => void;

  suppressFocusEventOnce: boolean;
  suppressBlurEventOnce: boolean;

  renderingCompleted: boolean;
  recaptureGlobalFocusEventAfterLocalFocusEvent: boolean;
}

export type CardMap = Map<string, ICard>;
