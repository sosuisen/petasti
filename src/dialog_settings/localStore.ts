/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import React from 'react';

/**
 * Local Redux Store used only in this Renderer process
 */
export interface LocalState {
  activeSettingId: string;
  previousActiveSettingId: string;
}
export interface LocalAction {
  type: 'UpdateActiveSetting';
  activeSettingId: string;
}
export const LocalReducer = (state: LocalState, action: LocalAction) => {
  if (action.type === 'UpdateActiveSetting') {
    const nextState: LocalState = {
      activeSettingId: action.activeSettingId,
      previousActiveSettingId: state.activeSettingId,
    };
    return nextState;
  }
  return state;
};
export const LocalContext = React.createContext<LocalState | any>('');
export type LocalProvider = [LocalState, React.Dispatch<LocalAction>];
