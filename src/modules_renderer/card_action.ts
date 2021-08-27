/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { CardBody, CardSketch, CardStatus } from '../modules_common/types';

export interface CardBodyInitAction {
  type: 'card-body-init';
  payload: CardBody;
}

export interface CardBodyUpdateAction {
  type: 'card-body-update';
  payload: CardBody;
}

export type CardBodyAction = CardBodyInitAction | CardBodyUpdateAction;

export interface CardSketchInitAction {
  type: 'card-sketch-init';
  payload: CardSketch;
}

export interface CardSketchUpdateAction {
  type: 'card-sketch-update';
  payload: CardSketch;
}

export type CardSketchAction = CardSketchInitAction | CardSketchUpdateAction;

export interface CardWorkStateStatusUpdateAction {
  type: 'card-work-state-status-update';
  payload: CardStatus;
}

export type CardWorkStateAction = CardWorkStateStatusUpdateAction;

export type CardAction = CardBodyAction | CardSketchAction | CardWorkStateAction;
