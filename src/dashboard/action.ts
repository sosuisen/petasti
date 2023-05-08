/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */

import { InfoState } from '../modules_common/store.types';

export interface InfoInitAction {
  type: 'info-init';
  payload: InfoState;
}

export type InfoAction = InfoInitAction;
