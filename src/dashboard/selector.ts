/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { DashboardState } from '../modules_common/search.types';

export const selectorMessages = (state: DashboardState) => {
  return state.info.messages;
};

export const selectorSearchResult = (state: DashboardState) => {
  return state.searchResult;
};
