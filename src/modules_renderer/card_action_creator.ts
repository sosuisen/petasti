/**
 * Petasti
 * © 2022 Hidekazu Kubota
 */
import AsyncLock from 'async-lock';
import { TaskMetadata } from 'git-documentdb';
import { Dispatch } from 'redux';
import {
  DatabaseCardBodyUpdate,
  DatabaseCardSketchUpdate,
} from '../modules_common/db.types';
import {
  CardLabel,
  CardSketch,
  CardStatus,
  CardStyle,
  Geometry,
} from '../modules_common/types';
import { getCurrentDateAndTime, isLabelOpened } from '../modules_common/utils';
import {
  CardBodyUpdateAction,
  CardCollapsedListUpdateAction,
  CardConditionUpdateAction,
  CardGeometryUpdateAction,
  CardLabelRectUpdateAction,
  CardLabelUpdateAction,
  CardSketchModifiedDateUpdateAction,
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
    if (getState().body._id === '') return;

    await lock.acquire('body', async () => {
      if (enqueueTime !== undefined) {
        if (bodyUpdatedTime !== undefined && bodyUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      if (JSON.stringify(getState().body) === JSON.stringify(_body)) {
        return;
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

export const cardCollapsedListUpdateCreator = (
  collapsedList: number[],
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => CardState) {
    await lock.acquire('sketch', async () => {
      if (enqueueTime !== undefined) {
        if (sketchUpdatedTime !== undefined && sketchUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      if (
        JSON.stringify(getState().sketch.collapsedList) === JSON.stringify(collapsedList)
      ) {
        return;
      }

      const cardAction: CardCollapsedListUpdateAction = {
        type: 'card-collapsed-list-update',
        payload: collapsedList,
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

        const taskMetadata: TaskMetadata | false = await window.api.db(cmd);
        if (taskMetadata !== false) {
          // eslint-disable-next-line require-atomic-updates
          sketchUpdatedTime = taskMetadata.enqueueTime!;
        }
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
    if (getState().sketch._id === '') return;

    // eslint-disable-next-line complexity
    await lock.acquire('sketch', async () => {
      if (enqueueTime !== undefined) {
        if (sketchUpdatedTime !== undefined && sketchUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      if (JSON.stringify(getState().sketch) === JSON.stringify(cardSketch)) {
        return;
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

      const cardDateAction: CardSketchModifiedDateUpdateAction = {
        type: 'card-sketch-modified-date-update',
        payload: getCurrentDateAndTime(),
      };
      dispatch(cardDateAction);

      const cardLabelAction: CardLabelUpdateAction = {
        type: 'card-label-update',
        payload: cardSketch.label,
      };
      dispatch(cardLabelAction);

      if (changeFrom === 'local') {
        const cmd: DatabaseCardSketchUpdate = {
          command: 'db-card-sketch-update',
          url: getState().workState.url,
          data: {
            ...getState().sketch,
          },
        };

        const taskMetadata: TaskMetadata | false = await window.api.db(cmd);
        if (taskMetadata !== false) {
          // eslint-disable-next-line require-atomic-updates
          sketchUpdatedTime = taskMetadata.enqueueTime!;
        }
      }
    });
  };
};

export const cardGeometryUpdateCreator = (
  geometry: Geometry,
  modifiedDate: string | undefined = undefined,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => CardState) {
    if (getState().sketch._id === '') return;

    // eslint-disable-next-line complexity
    await lock.acquire('sketch', async () => {
      if (enqueueTime !== undefined) {
        if (sketchUpdatedTime !== undefined && sketchUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      if (isLabelOpened(getState().sketch.label.status)) {
        if (
          geometry.x === getState().sketch.label.x &&
          geometry.y === getState().sketch.label.y &&
          geometry.width === getState().sketch.label.width &&
          geometry.height === getState().sketch.label.height
        ) {
          return;
        }

        // Change label size
        const cardLabelAction: CardLabelRectUpdateAction = {
          type: 'card-label-rect-update',
          payload: geometry,
        };
        dispatch(cardLabelAction);

        if (getState().sketch.label.status === 'openedSticker') {
          // Keep card position and size
          geometry.x = getState().sketch.geometry.x;
          geometry.y = getState().sketch.geometry.y;
        }
        geometry.width = getState().sketch.geometry.width;
        geometry.height = getState().sketch.geometry.height;
        const cardGeometryAction: CardGeometryUpdateAction = {
          type: 'card-geometry-update',
          payload: geometry,
        };
        dispatch(cardGeometryAction);
      }
      else {
        if (JSON.stringify(getState().sketch.geometry) === JSON.stringify(geometry)) {
          return;
        }

        const cardAction: CardGeometryUpdateAction = {
          type: 'card-geometry-update',
          payload: geometry,
        };
        dispatch(cardAction);

        if (getState().sketch.label.status === 'stashedLabel') {
          // Change stashedLabel to closedLabel when moved.
          const label = getState().sketch.label;
          label.status = 'closedLabel';
          label.x = geometry.x;
          label.y = geometry.y;
          const cardLabelAction: CardLabelUpdateAction = {
            type: 'card-label-update',
            payload: label,
          };
          dispatch(cardLabelAction);
        }
        else {
          if (getState().sketch.label.status === 'closedSticker') {
            // Keep label position and size
            geometry.x = getState().sketch.label.x!;
            geometry.y = getState().sketch.label.y!;
          }
          geometry.width = getState().sketch.label.width!;
          geometry.height = getState().sketch.label.height!;
          const cardLabelAction: CardLabelRectUpdateAction = {
            type: 'card-label-rect-update',
            payload: geometry,
          };
          dispatch(cardLabelAction);
        }
      }

      const cardDateAction: CardSketchModifiedDateUpdateAction = {
        type: 'card-sketch-modified-date-update',
        payload: modifiedDate || getCurrentDateAndTime(),
      };
      dispatch(cardDateAction);

      if (changeFrom === 'local') {
        const cmd: DatabaseCardSketchUpdate = {
          command: 'db-card-sketch-update',
          url: getState().workState.url,
          data: {
            ...getState().sketch,
          },
        };

        const taskMetadata: TaskMetadata | false = await window.api.db(cmd);
        if (taskMetadata !== false) {
          // eslint-disable-next-line require-atomic-updates
          sketchUpdatedTime = taskMetadata.enqueueTime!;
        }
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
    if (getState().sketch._id === '') return;

    await lock.acquire('sketch', async () => {
      if (enqueueTime !== undefined) {
        if (sketchUpdatedTime !== undefined && sketchUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      if (JSON.stringify(getState().sketch.style) === JSON.stringify(style)) {
        return;
      }

      const cardAction: CardStyleUpdateAction = {
        type: 'card-style-update',
        payload: style,
      };
      dispatch(cardAction);

      const cardDateAction: CardSketchModifiedDateUpdateAction = {
        type: 'card-sketch-modified-date-update',
        payload: getCurrentDateAndTime(),
      };
      dispatch(cardDateAction);

      if (changeFrom === 'local') {
        const cmd: DatabaseCardSketchUpdate = {
          command: 'db-card-sketch-update',
          url: getState().workState.url,
          data: {
            ...getState().sketch,
          },
        };

        const taskMetadata: TaskMetadata | false = await window.api.db(cmd);
        if (taskMetadata !== false) {
          // eslint-disable-next-line require-atomic-updates
          sketchUpdatedTime = taskMetadata.enqueueTime!;
        }
      }
    });
  };
};

/*
export const cardConditionLockedUpdateCreator = (
  locked: boolean,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => CardState) {
    if (getState().sketch._id === '') return;

    await lock.acquire('sketch', async () => {
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

      const cardDateAction: CardSketchModifiedDateUpdateAction = {
        type: 'card-sketch-modified-date-update',
        payload: getCurrentDateAndTime(),
      };
      dispatch(cardDateAction);

      if (changeFrom === 'local') {
        const cmd: DatabaseCardSketchUpdate = {
          command: 'db-card-sketch-update',
          url: getState().workState.url,
          data: {
            ...getState().sketch,
          },
        };

        const taskMetadata: TaskMetadata | false = await window.api.db(cmd);
        if (taskMetadata !== false) {
          // eslint-disable-next-line require-atomic-updates
          sketchUpdatedTime = taskMetadata.enqueueTime!;
        }
      }
    });
  };
};
*/

export const cardLabelUpdateCreator = (
  label: CardLabel,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => CardState) {
    if (getState().sketch._id === '') return;

    await lock.acquire('sketch', async () => {
      if (enqueueTime !== undefined) {
        if (sketchUpdatedTime !== undefined && sketchUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      if (JSON.stringify(getState().sketch.label) === JSON.stringify(label)) {
        return;
      }

      const cardAction: CardLabelUpdateAction = {
        type: 'card-label-update',
        payload: label,
      };
      dispatch(cardAction);

      const cardDateAction: CardSketchModifiedDateUpdateAction = {
        type: 'card-sketch-modified-date-update',
        payload: getCurrentDateAndTime(),
      };
      dispatch(cardDateAction);

      if (changeFrom === 'local') {
        const cmd: DatabaseCardSketchUpdate = {
          command: 'db-card-sketch-update',
          url: getState().workState.url,
          data: {
            ...getState().sketch,
          },
        };

        const taskMetadata: TaskMetadata | false = await window.api.db(cmd);
        if (taskMetadata !== false) {
          // eslint-disable-next-line require-atomic-updates
          sketchUpdatedTime = taskMetadata.enqueueTime!;
        }
      }
    });
  };
};

export const cardSketchBringToFrontCreator = () => {
  return function (dispatch: Dispatch<any>, getState: () => CardState) {
    if (getState().sketch._id === '') return;

    const cardStatusAction: CardWorkStateStatusUpdateAction = {
      type: 'card-work-state-status-update',
      payload: 'Focused',
    };
    dispatch(cardStatusAction);
  };
};

export const cardWorkStateStatusUpdateCreator = (status: CardStatus) => {
  return function (dispatch: Dispatch<any>, getState: () => CardState) {
    if (getState().sketch._id === '') return;

    const cardStatusAction: CardWorkStateStatusUpdateAction = {
      type: 'card-work-state-status-update',
      payload: status,
    };
    dispatch(cardStatusAction);
  };
};
