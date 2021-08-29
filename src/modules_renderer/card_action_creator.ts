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
import { CardBody } from '../modules_common/types';
import {
  CardBodyAction,
  CardBodyUpdateAction,
  CardSketchLockedUpdateAction,
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

export const cardSketchLockedUpdateCreator = (
  locked: boolean,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => CardBody) {
    await lock.acquire('cardSketchLockedUpdate', async () => {
      if (enqueueTime !== undefined) {
        if (sketchUpdatedTime !== undefined && sketchUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      const cardAction: CardSketchLockedUpdateAction = {
        type: 'card-sketch-locked-update',
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
