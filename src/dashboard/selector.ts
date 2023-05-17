/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { DashboardState } from './dashboard_local.types';

export const selectorMessages = (state: DashboardState) => {
  return state.info.messages;
};

export const selectorSearchResultNoteAndCard = (state: DashboardState) => {
  return state.searchResultNoteAndCard;
};

export const selectorSearchResultNote = (state: DashboardState) => {
  return state.searchResultNote;
};

export const selectorSelectedCard = (state: DashboardState) => {
  return state.selectedCard;
};

export const selectorDialog = (state: DashboardState) => {
  return state.dialog;
};

export const selecterSearchText = (state: DashboardState) => {
  return state.searchText;
};
