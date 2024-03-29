/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */

import { BrowserWindow } from 'electron';
import { MessagesRenderer } from './i18n';

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
  locked?: boolean;
};

/**
 * CardLabel
 * Properties for labelized card
 */
export type LabelStatus =
  | 'closedLabel'
  | 'stashedLabel'
  | 'closedSticker'
  | 'openedLabel'
  | 'openedSticker';

export type CardLabel = {
  status: LabelStatus;
  text: string | undefined;
  x: number | undefined;
  y: number | undefined;
  width: number | undefined;
  height: number | undefined;
  zoom: number | undefined;
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
  label: CardLabel;
  collapsedList: number[];
  date: CartaDate;
  _id: string;
};

export type NoteProp = {
  _id: string;
  name: string;
  user: string;
  date: CartaDate;

  zOrder: ZOrder;
  isResident: boolean;
  updatedTime?: string; // only for redux-thunk
};

export type CardWorkState = {
  url: string;
  status: CardStatus;
};

export type CardPositionDebounceItem = {
  cardX: number;
  cardY: number;
  labelX: number;
  labelY: number;
  modifiedDate: string;
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
  isFake: boolean;
  noWindow: boolean;
  // status: CardStatus;

  focus: () => void;

  setRect: (
    x: number,
    y: number,
    width: number,
    height: number,
    animation: boolean,
    animationMsec?: number
  ) => Promise<void>;
  removeWindowListenersExceptClosedEvent: () => void;
  removeWindowListeners: () => void;
  window: BrowserWindow | undefined;

  resetContextMenu: () => void;
  disposeContextMenu: () => void;

  suppressFocusEvent: boolean;
  suppressFocusEventOnce: boolean;
  suppressBlurEventOnce: boolean;

  renderingCompleted: boolean;
  recaptureGlobalFocusEventAfterLocalFocusEvent: boolean;

  moveToNote: (noteID: string) => Promise<void>;
  copyToNote: (noteID: string) => Promise<void>;

  hasSelection: boolean;
}

export type CardMap = Map<string, ICard>;

export type Snapshot = {
  version: string;
  name: string;
  backgroundColor: string;
  backgroundImage: string;
  createdDate: string;
  note: NoteProp;
  cards: {
    _id: string;
    sketch: Omit<CardSketch, '_id'>;
    body: Omit<CardBody, '_id'>;
  }[];
  _body: string;
};

export type RendererConfig = {
  messages: MessagesRenderer;
  os: 'win32' | 'darwin' | 'linux';
  isResident: boolean;
};

/**
 * url array from back to front
 */
export type ZOrder = string[];

export type Direction = 'up' | 'down' | 'left' | 'right';
export type RelativePositionOfCardUrl = {
  [key in Direction]: {
    url: string;
    distance: number;
    centroidDistance: number;
    radian: number;
  }[];
};
