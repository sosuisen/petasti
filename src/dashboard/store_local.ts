/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */

import React from 'react';

/**
 * Local Redux Store used only in this Renderer process
 */
export interface LocalState {
  activeDashboardId: string;
  previousActiveDashboardId: string;
}

export interface LocalAction {
  type: 'UpdateActiveSetting';
  activeDashboardId: string;
}

export const localReducer = (state: LocalState, action: LocalAction) => {
  if (action.type === 'UpdateActiveSetting') {
    const nextState: LocalState = {
      activeDashboardId: action.activeDashboardId,
      previousActiveDashboardId: state.activeDashboardId,
    };
    return nextState;
  }
  return state;
};
export const localContext = React.createContext<LocalState | any>({
  activeDashboardId: '',
  previousActiveDashboardId: '',
});
export type LocalProvider = [LocalState, React.Dispatch<LocalAction>];
