/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

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

// For TypeScript
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

export type NoteProp = {
  _id: string;
  name: string;
  user: string;
  date: CartaDate;
};

export type CardStatus = 'Focused' | 'Blurred';
