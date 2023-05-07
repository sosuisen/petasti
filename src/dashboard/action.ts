/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { DashboardState, InfoState } from '../modules_common/store.types';

export interface InfoInitAction {
  type: 'info-init';
  payload: InfoState;
}

export type InfoAction = InfoInitAction;

export interface DashboardInitAction {
  type: 'dashboard-init';
  payload: DashboardState;
}

export type DashboardAction = DashboardInitAction;
