/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import {
  CardBody,
  CardCondition,
  CardStatus,
  CardStyle,
  CardWorkState,
  CartaDate,
  Geometry,
  LabelProp,
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

export interface CardConditionLabelUpdateAction {
  type: 'card-condition-label-update';
  payload: LabelProp;
}

export type CardConditionAction =
  | CardConditionInitAction
  | CardConditionUpdateAction
  | CardConditionLockedUpdateAction
  | CardConditionLabelUpdateAction;

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
