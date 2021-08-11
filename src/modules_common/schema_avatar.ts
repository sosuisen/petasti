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
  version: number;
};

export type AvatarWithSkipForward = {
  skipForward?: boolean;
} & Avatar;

export type AvatarWithRevision = {
  _rev?: string;
} & Avatar;

// For RxDB
export const avatarSchema = {
  title: 'Avatar Schema',
  description: 'RxSchema for avatars of RxDesktop',
  version: 0,
  type: 'object',
  properties: {
    url: {
      primary: true,
      type: 'string',
    },
    geometry: {
      type: 'object',
      properties: {
        x: {
          type: 'number',
        },
        y: {
          type: 'number',
        },
        z: {
          type: 'number',
        },
        width: {
          type: 'number',
        },
        height: {
          type: 'number',
        },
      },
    },
    style: {
      type: 'object',
      properties: {
        uiColor: {
          type: 'string',
        },
        backgroundColor: {
          type: 'string',
        },
        opacity: {
          type: 'number',
        },
        zoom: {
          type: 'number',
        },
      },
    },
    condition: {
      type: 'object',
      properties: {
        locked: {
          type: 'boolean',
        },
      },
    },
    date: {
      type: 'object',
      properties: {
        createdDate: {
          type: 'string',
        },
        modifiedDate: {
          type: 'string',
        },
      },
    },
    version: {
      type: 'number',
      default: 0,
    },
  },
};
