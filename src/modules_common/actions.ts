import { Geometry2D, GeometryXY } from './schema_avatar';

const actionTypes = [
  'avatar-position-update',
  'avatar-size-update',
  'avatar-depth-update',
] as const;
export type ActionType = typeof actionTypes[number];

/**
 * Updated store state is transferred from Main Process to Renderer Process,
 * unless SkipForward is true.
 */
export type RxDesktopAction = {
  type: ActionType;
  payload: any;
  skipForward?: boolean;
};

export interface AvatarPositionUpdateAction extends RxDesktopAction {
  type: 'avatar-position-update';
  payload: {
    url: string;
    geometry: GeometryXY;
  };
}

export interface AvatarSizeUpdateAction extends RxDesktopAction {
  type: 'avatar-size-update';
  payload: {
    url: string;
    geometry: Geometry2D;
  };
}

export interface AvatarDepthUpdateAction extends RxDesktopAction {
  type: 'avatar-depth-update';
  payload: {
    url: string;
    z: number;
  };
}

export type PersistentStoreAction =
  | AvatarPositionUpdateAction
  | AvatarSizeUpdateAction
  | AvatarDepthUpdateAction;

export const avatarPositionUpdateActionCreator = (
  url: string,
  geometry: GeometryXY,
  skipForward?: boolean
) => {
  const action: AvatarPositionUpdateAction = {
    type: 'avatar-position-update',
    payload: {
      url,
      geometry,
    },
    skipForward: skipForward ?? false,
  };
  return action;
};

export const avatarSizeUpdateActionCreator = (
  url: string,
  geometry: Geometry2D,
  skipForward?: boolean
) => {
  const action: AvatarSizeUpdateAction = {
    type: 'avatar-size-update',
    payload: {
      url,
      geometry,
    },
    skipForward: skipForward ?? false,
  };
  return action;
};

export const avatarDepthUpdateActionCreator = (
  url: string,
  z: number,
  skipForward?: boolean
) => {
  const action: AvatarDepthUpdateAction = {
    type: 'avatar-depth-update',
    payload: {
      url,
      z,
    },
    skipForward: skipForward ?? false,
  };
  return action;
};
