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
import { CardBody, CardCondition, Geometry } from '../modules_common/types';
import {
  CardBodyUpdateAction,
  CardConditionAction,
  CardConditionLockedUpdateAction,
  CardGeometryZUpdateAction,
} from './card_action';
import window from './window';

type ChangeFrom = 'local' | 'remote';

const lock = new AsyncLock();

let bodyUpdatedTime: string;
let sketchUpdatedTime: string;

export const cardBodyUpdateCreator = (
  cardBody: CardBody,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => CardBody) {
    await lock.acquire('cardUpdate', async () => {
      if (enqueueTime !== undefined) {
        if (bodyUpdatedTime !== undefined && bodyUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      const cardAction: CardBodyUpdateAction = {
        type: 'card-body-update',
        payload: cardBody,
      };
      dispatch(cardAction);

      if (changeFrom === 'local') {
        const newCardBody = getState();
        const cmd: DatabaseCardBodyUpdate = {
          command: 'db-card-body-update',
          data: newCardBody,
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
  return async function (dispatch: Dispatch<any>, getState: () => CardCondition) {
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
        const newCardBody = getState();
        const cmd: DatabaseCardSketchUpdate = {
          command: 'db-card-sketch-update',
          data: newCardBody,
        };

        const taskMetadata: TaskMetadata = await window.api.db(cmd);
        // eslint-disable-next-line require-atomic-updates
        bodyUpdatedTime = taskMetadata.enqueueTime!;
      }
    });
  };
};

export const cardSketchBringToFrontCreator = (cardUrl: string) => {
  return async function (dispatch: Dispatch<any>, getState: () => Geometry) {
    const newZ = await window.api.bringToFront(cardUrl);
    if (newZ === undefined) return;
    // eslint-disable-next-line require-atomic-updates
    cardPropStatus.geometry.z = newZ;
  
    cardPropStatus.status = 'Focused';
  
    const cardAction: CardGeometryZUpdateAction = {
      type: 'card-geometry-z-update',
      payload: zIndex,
    };
    dispatch(cardAction);
  };
};

export const cardSketchSendToBackCreator = (zIndex: number) => {
  return function (dispatch: Dispatch<any>, getState: () => Geometry) {
    const cardAction: CardGeometryZUpdateAction = {
      type: 'card-geometry-z-update',
      payload: zIndex,
    };
    dispatch(cardAction);
  };
};
