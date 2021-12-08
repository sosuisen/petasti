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
import {
  CardLabel,
  CardSketch,
  CardStatus,
  CardStyle,
  Geometry,
} from '../modules_common/types';
import { getCurrentDateAndTime } from '../modules_common/utils';
import {
  CardBodyUpdateAction,
  CardConditionLockedUpdateAction,
  CardConditionUpdateAction,
  CardGeometryUpdateAction,
  CardGeometryZUpdateAction,
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
    if (getState().sketch._id === '') return;

    // eslint-disable-next-line complexity
    await lock.acquire('sketch', async () => {
      if (enqueueTime !== undefined) {
        if (bodyUpdatedTime !== undefined && bodyUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }
      const prevX = getState().sketch.geometry.x;
      const prevY = getState().sketch.geometry.y;
      const prevWidth = getState().sketch.geometry.width;
      const prevHeight = getState().sketch.geometry.height;
      const cardGeometryAction: CardGeometryUpdateAction = {
        type: 'card-geometry-update',
        payload: cardSketch.geometry,
      };
      dispatch(cardGeometryAction);
      if (changeFrom === 'remote') {
        const newGeom = cardSketch.geometry;
        if (
          newGeom.x !== prevX ||
          newGeom.y !== prevY ||
          newGeom.width !== prevWidth ||
          newGeom.height !== prevHeight
        ) {
          // Cannot move out of screen
          // window.moveTo(newGeom.x, newGeom.y);
          window.api.setWindowRect(
            getState().workState.url,
            newGeom.x,
            newGeom.y,
            newGeom.width,
            newGeom.height
          );
        }
      }

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
          bodyUpdatedTime = taskMetadata.enqueueTime!;
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

    await lock.acquire('sketch', async () => {
      if (enqueueTime !== undefined) {
        if (bodyUpdatedTime !== undefined && bodyUpdatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }

      if (getState().sketch.label.enabled) {
        // Change label size
        const cardLabelAction: CardLabelRectUpdateAction = {
          type: 'card-label-rect-update',
          payload: {
            x: geometry.x,
            y: geometry.y,
            width: geometry.width,
            height: geometry.height,
          },
        };
        dispatch(cardLabelAction);

        // Keep card position and size
        geometry.x = getState().sketch.geometry.x;
        geometry.y = getState().sketch.geometry.y;
        geometry.width = getState().sketch.geometry.width;
        geometry.height = getState().sketch.geometry.height;
        const cardGeometryAction: CardGeometryUpdateAction = {
          type: 'card-geometry-update',
          payload: geometry,
        };
        dispatch(cardGeometryAction);
      }
      else {
        const cardAction: CardGeometryUpdateAction = {
          type: 'card-geometry-update',
          payload: geometry,
        };
        dispatch(cardAction);
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
          bodyUpdatedTime = taskMetadata.enqueueTime!;
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
          bodyUpdatedTime = taskMetadata.enqueueTime!;
        }
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
          bodyUpdatedTime = taskMetadata.enqueueTime!;
        }
      }
    });
  };
};

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
          bodyUpdatedTime = taskMetadata.enqueueTime!;
        }
      }
    });
  };
};

export const cardSketchBringToFrontCreator = (
  zIndex: number | undefined,
  modifiedDate: string | undefined
) => {
  return function (dispatch: Dispatch<any>, getState: () => CardState) {
    if (getState().sketch._id === '') return;

    if (zIndex !== undefined) {
      const cardGeometryAction: CardGeometryZUpdateAction = {
        type: 'card-geometry-z-update',
        payload: zIndex,
      };
      dispatch(cardGeometryAction);

      const cardDateAction: CardSketchModifiedDateUpdateAction = {
        type: 'card-sketch-modified-date-update',
        payload: modifiedDate!,
      };
      dispatch(cardDateAction);
    }
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

export const cardSketchSendToBackCreator = (zIndex: number, modifiedDate: string) => {
  return function (dispatch: Dispatch<any>, getState: () => CardState) {
    if (getState().sketch._id === '') return;

    const cardAction: CardGeometryZUpdateAction = {
      type: 'card-geometry-z-update',
      payload: zIndex,
    };
    dispatch(cardAction);

    const cardDateAction: CardSketchModifiedDateUpdateAction = {
      type: 'card-sketch-modified-date-update',
      payload: modifiedDate,
    };
    dispatch(cardDateAction);
  };
};
