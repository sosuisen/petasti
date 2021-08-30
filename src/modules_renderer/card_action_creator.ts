/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import AsyncLock from 'async-lock';
import { TaskMetadata } from 'git-documentdb';
import { Dispatch } from 'redux';
import {
  DatabaseCardBodyUpdate,
  DatabaseCardSketchUpdate,
} from '../modules_common/db.types';
import { CardSketch, CardStatus, CardStyle, Geometry } from '../modules_common/types';
import {
  CardBodyUpdateAction,
  CardConditionLockedUpdateAction,
  CardConditionUpdateAction,
  CardGeometryUpdateAction,
  CardGeometryZUpdateAction,
  CardStyleUpdateAction,
  CardWorkStateStatusUpdateAction,
} from './card_action';
import { CardState, ChangeFrom } from './card_types';
import window from './window';

const lock = new AsyncLock();

let bodyUpdatedTime: string;
let sketchUpdatedTime: string;

export const cardBodyUpdateCreator = (
  _body: string,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => CardState) {
    await lock.acquire('cardBodyUpdate', async () => {
      if (enqueueTime !== undefined) {
        if (bodyUpdatedTime !== undefined && bodyUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      const cardAction: CardBodyUpdateAction = {
        type: 'card-body-body-update',
        payload: _body,
      };
      dispatch(cardAction);

      if (changeFrom === 'local') {
        const newCardBody = getState().body;
        const cmd: DatabaseCardBodyUpdate = {
          command: 'db-card-body-update',
          url: getState().workState.url,
          data: newCardBody,
        };

        const taskMetadata: TaskMetadata = await window.api.db(cmd);
        // eslint-disable-next-line require-atomic-updates
        bodyUpdatedTime = taskMetadata.enqueueTime!;
      }
    });
  };
};

export const cardSketchUpdateCreator = (
  cardSketch: CardSketch,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => CardState) {
    await lock.acquire('cardSketchUpdate', async () => {
      if (enqueueTime !== undefined) {
        if (bodyUpdatedTime !== undefined && bodyUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      const cardGeometryAction: CardGeometryUpdateAction = {
        type: 'card-geometry-update',
        payload: cardSketch.geometry,
      };
      dispatch(cardGeometryAction);

      const cardStyleAction: CardStyleUpdateAction = {
        type: 'card-style-update',
        payload: cardSketch.style,
      };
      dispatch(cardStyleAction);

      const cardConditionAction: CardConditionUpdateAction = {
        type: 'card-condition-update',
        payload: cardSketch.condition,
      };
      dispatch(cardConditionAction);

      if (changeFrom === 'local') {
        const cmd: DatabaseCardSketchUpdate = {
          command: 'db-card-sketch-update',
          url: getState().workState.url,
          data: {
            ...getState().sketch,
          },
        };

        const taskMetadata: TaskMetadata = await window.api.db(cmd);
        // eslint-disable-next-line require-atomic-updates
        bodyUpdatedTime = taskMetadata.enqueueTime!;
      }
    });
  };
};

export const cardGeometryUpdateCreator = (
  geometry: Geometry,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => CardState) {
    await lock.acquire('cardGeometryUpdate', async () => {
      if (enqueueTime !== undefined) {
        if (bodyUpdatedTime !== undefined && bodyUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      const cardAction: CardGeometryUpdateAction = {
        type: 'card-geometry-update',
        payload: geometry,
      };
      dispatch(cardAction);

      if (changeFrom === 'local') {
        const cmd: DatabaseCardSketchUpdate = {
          command: 'db-card-sketch-update',
          url: getState().workState.url,
          data: {
            ...getState().sketch,
          },
        };

        const taskMetadata: TaskMetadata = await window.api.db(cmd);
        // eslint-disable-next-line require-atomic-updates
        bodyUpdatedTime = taskMetadata.enqueueTime!;
      }
    });
  };
};

export const cardStyleUpdateCreator = (
  style: CardStyle,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => CardState) {
    await lock.acquire('cardStyleUpdate', async () => {
      if (enqueueTime !== undefined) {
        if (bodyUpdatedTime !== undefined && bodyUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      const cardAction: CardStyleUpdateAction = {
        type: 'card-style-update',
        payload: style,
      };
      dispatch(cardAction);

      if (changeFrom === 'local') {
        const cmd: DatabaseCardSketchUpdate = {
          command: 'db-card-sketch-update',
          url: getState().workState.url,
          data: {
            ...getState().sketch,
          },
        };

        const taskMetadata: TaskMetadata = await window.api.db(cmd);
        // eslint-disable-next-line require-atomic-updates
        bodyUpdatedTime = taskMetadata.enqueueTime!;
      }
    });
  };
};

export const cardConditionLockedUpdateCreator = (
  locked: boolean,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => CardState) {
    await lock.acquire('cardConditionLockedUpdate', async () => {
      if (enqueueTime !== undefined) {
        if (sketchUpdatedTime !== undefined && sketchUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      const cardAction: CardConditionLockedUpdateAction = {
        type: 'card-condition-locked-update',
        payload: locked,
      };
      dispatch(cardAction);

      if (changeFrom === 'local') {
        const cmd: DatabaseCardSketchUpdate = {
          command: 'db-card-sketch-update',
          url: getState().workState.url,
          data: {
            ...getState().sketch,
          },
        };

        const taskMetadata: TaskMetadata = await window.api.db(cmd);
        // eslint-disable-next-line require-atomic-updates
        bodyUpdatedTime = taskMetadata.enqueueTime!;
      }
    });
  };
};

export const cardSketchBringToFrontCreator = (sketchUrl: string) => {
  return async function (dispatch: Dispatch<any>, getState: () => CardState) {
    const newZ = await window.api.bringToFront(sketchUrl);
    if (newZ === undefined) return;

    const cardGeometryAction: CardGeometryZUpdateAction = {
      type: 'card-geometry-z-update',
      payload: newZ,
    };
    dispatch(cardGeometryAction);
    const cardStatusAction: CardWorkStateStatusUpdateAction = {
      type: 'card-work-state-status-update',
      payload: 'Focused',
    };
    dispatch(cardStatusAction);
  };
};

export const cardWorkStateStatusUpdateCreator = (status: CardStatus) => {
  return function (dispatch: Dispatch<any>, getState: () => CardState) {
    const cardStatusAction: CardWorkStateStatusUpdateAction = {
      type: 'card-work-state-status-update',
      payload: status,
    };
    dispatch(cardStatusAction);
  };
};

export const cardSketchSendToBackCreator = (zIndex: number) => {
  return function (dispatch: Dispatch<any>, getState: () => CardState) {
    const cardAction: CardGeometryZUpdateAction = {
      type: 'card-geometry-z-update',
      payload: zIndex,
    };
    dispatch(cardAction);
  };
};
