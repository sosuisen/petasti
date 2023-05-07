/**
 * Petasti
 * © 2023 Hidekazu Kubota
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

export const localReducer = (state: LocalState, action: LocalAction) => {
  if (action.type === 'UpdateActiveSetting') {
    const nextState: LocalState = {
      activeSettingId: action.activeSettingId,
      previousActiveSettingId: state.activeSettingId,
    };
    return nextState;
  }
  return state;
};
export const localContext = React.createContext<LocalState | any>({
  activeSettingId: '',
  previousActiveSettingId: '',
});
export type LocalProvider = [LocalState, React.Dispatch<LocalAction>];
