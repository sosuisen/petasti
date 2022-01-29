/**
 * TreeStickies
 * © 2022 Hidekazu Kubota
 */

import {
  CardBody,
  CardCondition,
  CardLabel,
  CardStatus,
  CardStyle,
  CardWorkState,
  CartaDate,
  Geometry,
} from '../modules_common/types';

/**
 * CardBodyAction
 */
export interface CardBodyInitAction {
  type: 'card-body-init';
  payload: CardBody;
}

export interface CardBodyUpdateAction {
  type: 'card-body-body-update';
  payload: string;
}

export type CardBodyAction = CardBodyInitAction | CardBodyUpdateAction;

/**
 * CardGeometryAction
 */
export interface CardGeometryInitAction {
  type: 'card-geometry-init';
  payload: Geometry;
}
export interface CardGeometryUpdateAction {
  type: 'card-geometry-update';
  payload: Geometry;
}

export interface CardGeometryZUpdateAction {
  type: 'card-geometry-z-update';
  payload: number;
}

export type CardGeometryAction =
  | CardGeometryInitAction
  | CardGeometryUpdateAction
  | CardGeometryZUpdateAction;

/**
 * CardStyleAction
 */
export interface CardStyleInitAction {
  type: 'card-style-init';
  payload: CardStyle;
}

export interface CardStyleUpdateAction {
  type: 'card-style-update';
  payload: CardStyle;
}

export type CardStyleAction = CardStyleInitAction | CardStyleUpdateAction;

/**
 * CardConditionAction
 */
export interface CardConditionInitAction {
  type: 'card-condition-init';
  payload: CardCondition;
}

export interface CardConditionUpdateAction {
  type: 'card-condition-update';
  payload: CardCondition;
}

export interface CardConditionLockedUpdateAction {
  type: 'card-condition-locked-update';
  payload: boolean;
}

export type CardConditionAction =
  | CardConditionInitAction
  | CardConditionUpdateAction
  | CardConditionLockedUpdateAction;

/**
 * CardLabelAction
 */
export interface CardLabelInitAction {
  type: 'card-label-init';
  payload: CardLabel;
}

export interface CardLabelUpdateAction {
  type: 'card-label-update';
  payload: CardLabel;
}

export interface CardLabelRectUpdateAction {
  type: 'card-label-rect-update';
  payload: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type CardLabelAction =
  | CardLabelInitAction
  | CardLabelUpdateAction
  | CardLabelRectUpdateAction;

/**
 * CardCollapsedListAction
 */
export interface CardCollapsedListInitAction {
  type: 'card-collapsed-list-init';
  payload: number[];
}

export interface CardCollapsedListUpdateAction {
  type: 'card-collapsed-list-update';
  payload: number[];
}

export type CardCollapsedListAction =
  | CardCollapsedListInitAction
  | CardCollapsedListUpdateAction;

/**
 * CardSketchDateAction
 */
export type CardSketchDateInitAction = {
  type: 'card-sketch-date-init';
  payload: CartaDate;
};

export type CardSketchDateUpdateAction = {
  type: 'card-sketch-date-update';
  payload: CartaDate;
};

export type CardSketchModifiedDateUpdateAction = {
  type: 'card-sketch-modified-date-update';
  payload: string;
};

export type CardSketchDateAction =
  | CardSketchDateInitAction
  | CardSketchDateUpdateAction
  | CardSketchModifiedDateUpdateAction;

/**
 * CardSketchIdAction
 */
export type CardSketchIdInitAction = {
  type: 'card-sketch-id-init';
  payload: string;
};

/**
 * CardWorkStateAction
 */
export interface CardWorkStateInitAction {
  type: 'card-work-state-init';
  payload: CardWorkState;
}

export interface CardWorkStateStatusUpdateAction {
  type: 'card-work-state-status-update';
  payload: CardStatus;
}

export type CardWorkStateAction = CardWorkStateInitAction | CardWorkStateStatusUpdateAction;

/**
 * CardAction
 */
export type CardAction =
  | CardBodyAction
  | CardGeometryAction
  | CardStyleAction
  | CardConditionAction
  | CardSketchDateAction
  | CardSketchIdInitAction
  | CardWorkStateAction;
