import { CartaDate } from './types';

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
export type AvatarStyle = {
  uiColor: string;
  backgroundColor: string;
  opacity: number;
  zoom: number;
};

/**
 * CardCondition
 * Serializable condition of a card
 */
export type AvatarCondition = {
  locked: boolean;
};

// For TypeScript
export type Avatar = {
  url: string;
  data: string;
  geometry: Geometry;
  style: AvatarStyle;
  condition: AvatarCondition;
  date: CartaDate;
};

export type AvatarWithSkipForward = {
  skipForward?: boolean;
} & Avatar;

export type AvatarWithRevision = {
  _rev?: string;
} & Avatar;
