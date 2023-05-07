/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { DashboardState } from '../modules_common/store.types';

export const selectorMessages = (state: DashboardState) => {
  return state.info.messages;
};
