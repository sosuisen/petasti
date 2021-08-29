/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import {
  CardBody,
  CardCondition,
  CardStatus,
  CardStyle,
  Geometry,
} from '../modules_common/types';

/**
 * CardBodyAction
 */
export interface CardBodyUpdateAction {
  type: 'card-body-update';
  payload: CardBody;
}

export type CardBodyAction = CardBodyUpdateAction;

/**
 * CardGeometryAction
 */
export interface CardGeometryUpdateAction {
  type: 'card-geometry-update';
  payload: Geometry;
}

export interface CardGeometryZUpdateAction {
  type: 'card-geometry-z-update';
  payload: number;
}

export type CardGeometryAction = CardGeometryUpdateAction | CardGeometryZUpdateAction;

/**
 * CardStyleAction
 */
export interface CardStyleUpdateAction {
  type: 'card-style-update';
  payload: CardStyle;
}

export type CardStyleAction = CardStyleUpdateAction;

/**
 * CardConditionAction
 */
export interface CardConditionUpdateAction {
  type: 'card-condition-update';
  payload: CardCondition;
}

export interface CardConditionLockedUpdateAction {
  type: 'card-condition-locked-update';
  payload: boolean;
}

export type CardConditionAction =
  | CardConditionUpdateAction
  | CardConditionLockedUpdateAction;

/**
 * CardWorkStateAction
 */
export interface CardWorkStateStatusUpdateAction {
  type: 'card-work-state-status-update';
  payload: CardStatus;
}

export type CardWorkStateAction = CardWorkStateStatusUpdateAction;

/**
 * CardAction
 */
export type CardAction =
  | CardBodyAction
  | CardGeometryAction
  | CardStyleAction
  | CardConditionAction
  | CardWorkStateAction;
