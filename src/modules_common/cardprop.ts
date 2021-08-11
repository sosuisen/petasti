/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { getCurrentDateAndTime } from './utils';
import { cardColors, darkenHexColor } from './color';
import { getCurrentWorkspaceUrl } from '../modules_main/store_workspaces';
import { CartaDate } from './types';
import { Avatar, AvatarCondition, AvatarStyle, Geometry } from './schema_avatar';

export const cardVersion = '1.0';

// Dragging is shaky when _DRAG_IMAGE_MARGIN is too small, especially just after loading a card.
//  private _DRAG_IMAGE_MARGIN = 20;
export const DRAG_IMAGE_MARGIN = 50;

export type CardBase = {
  version: string;
  id: string;
  data: string;
};

export type CardStatus = 'Focused' | 'Blurred';

export const DEFAULT_CARD_GEOMETRY: Geometry = {
  x: 70,
  y: 70,
  z: 0,
  width: 300,
  height: 300,
};
export const DEFAULT_CARD_STYLE: AvatarStyle = {
  uiColor: '',
  backgroundColor: cardColors.yellow,
  opacity: 1.0,
  zoom: 1.0,
};
export const DEFAULT_CARD_CONDITION: AvatarCondition = {
  locked: false,
};
DEFAULT_CARD_STYLE.uiColor = darkenHexColor(DEFAULT_CARD_STYLE.backgroundColor);

export class TransformableFeature {
  public geometry: Geometry = DEFAULT_CARD_GEOMETRY;
  public style: AvatarStyle = DEFAULT_CARD_STYLE;
  public condition: AvatarCondition = DEFAULT_CARD_CONDITION;
  public date: CartaDate = {
    createdDate: getCurrentDateAndTime(),
    modifiedDate: getCurrentDateAndTime(),
  };

  // eslint-disable-next-line complexity
  constructor (
    _geometry?: Geometry,
    _style?: AvatarStyle,
    _condition?: AvatarCondition,
    _date?: CartaDate
  ) {
    if (
      _geometry !== undefined &&
      _geometry.x !== undefined &&
      _geometry.y !== undefined &&
      _geometry.z !== undefined
    ) {
      this.geometry = _geometry;
    }
    this.geometry.x = Math.round(this.geometry.x);
    this.geometry.y = Math.round(this.geometry.y);
    this.geometry.z = Math.round(this.geometry.z);
    this.geometry.width = Math.round(this.geometry.width);
    this.geometry.height = Math.round(this.geometry.height);

    if (
      _style !== undefined &&
      _style.backgroundColor !== undefined &&
      _style.opacity !== undefined &&
      _style.uiColor !== undefined &&
      _style.zoom !== undefined
    ) {
      this.style = _style;
    }

    if (_condition !== undefined && _condition.locked !== undefined) {
      this.condition = _condition;
    }

    if (
      _date !== undefined &&
      _date.createdDate !== undefined &&
      _date.modifiedDate !== undefined
    ) {
      this.date = _date;
    }
  }
}

export type CardAvatars = { [key: string]: TransformableFeature };

// Properties of a card that must be serialized
// Each of them must have unique name to be able to use as a key when serialize.
export type CardPropSerializable = CardBase & { avatars: CardAvatars };

export type AvatarPropSerializable = Omit<Avatar, 'version'>;

export class AvatarProp extends TransformableFeature {
  public version = cardVersion;
  public url = '';
  public data = '';
  public status: CardStatus = 'Blurred';

  constructor (_url: string, _data?: string, _feature?: TransformableFeature) {
    super(_feature?.geometry, _feature?.style, _feature?.condition, _feature?.date);

    this.url = _url;

    if (_data !== undefined) {
      this.data = _data;
    }
  }

  static getPlainText = (data: string) => {
    if (data === '') {
      return '';
    }

    // Replace alt attributes
    data = data.replace(/<[^>]+?alt=["'](.+?)["'][^>]+?>/g, '$1');

    return data.replace(/<[^>]+?>/g, '').substr(0, 30);
  };

  public toObject = (): AvatarPropSerializable => {
    return {
      url: this.url,
      data: this.data,
      geometry: this.geometry,
      style: this.style,
      condition: this.condition,
      date: this.date,
    };
  };

  public static fromObject = (json: AvatarPropSerializable): AvatarProp => {
    const feature: TransformableFeature = {
      geometry: json.geometry,
      style: json.style,
      condition: json.condition,
      date: json.date,
    };
    return new AvatarProp(json.url, json.data, feature);
  };
}

export class CardProp implements CardBase {
  public version = cardVersion;
  public id = '';
  public data = '';
  public avatars: CardAvatars;

  // eslint-disable-next-line complexity
  constructor (_id?: string, _data?: string, _avatars?: CardAvatars) {
    if (_id !== undefined) {
      this.id = _id;
    }

    if (_data !== undefined) {
      this.data = _data;
    }

    if (_avatars !== undefined) {
      for (const url in _avatars) {
        if (_avatars[url] === undefined) {
          _avatars[url] = new TransformableFeature();
        }
      }
      this.avatars = _avatars;
    }
    else {
      this.avatars = {};
      this.avatars[getCurrentWorkspaceUrl()] = new TransformableFeature();
    }
  }

  static getPlainText = (data: string) => {
    if (data === '') {
      return '';
    }

    // Replace alt attributes
    data = data.replace(/<[^>]+?alt=["'](.+?)["'][^>]+?>/g, '$1');

    return data.replace(/<[^>]+?>/g, '').substr(0, 30);
  };

  public toObject = (): CardPropSerializable => {
    return {
      version: this.version,
      id: this.id,
      data: this.data,
      avatars: this.avatars,
    };
  };

  public static fromObject = (json: CardPropSerializable): CardProp => {
    return new CardProp(json.id, json.data, json.avatars);
  };
}
