/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import * as React from 'react';
import { ipcRenderer } from 'electron';
import {
  initialSettingsState,
  PersistentSettingsAction,
  SettingsState,
} from '../modules_common/store_settings.types';

// 'SettingsState' is used both Main process and this Renderer process.
// ! Notice that it is not shared with Main and Renderer processes by reference,
// ! but individually bound to each process.
export type GlobalProvider = [SettingsState, (action: PersistentSettingsAction) => void];
export const GlobalContext = React.createContext<SettingsState | any>(initialSettingsState);

/**
 * Local Redux Store used only in this Renderer process
 */
export interface SettingsDialogState {
  activeSettingId: string;
  previousActiveSettingId: string;
}
export interface SettingsDialogAction {
  type: 'UpdateActiveSetting';
  activeSettingId: string;
}
const SettingsDialogReducer = (
  state: SettingsDialogState,
  action: SettingsDialogAction
) => {
  if (action.type === 'UpdateActiveSetting') {
    const nextState: SettingsDialogState = {
      activeSettingId: action.activeSettingId,
      previousActiveSettingId: state.activeSettingId,
    };
    return nextState;
  }
  return state;
};
export const SettingsDialogContext = React.createContext<SettingsDialogState | any>('');
export type SettingsDialogProvider = [
  SettingsDialogState,
  React.Dispatch<SettingsDialogAction>
];

/**
 * StoreProvider
 */
export const StoreProvider = (props: {
  defaultSettingId: string;
  children: React.ReactNode;
}) => {
  const [globalState, localDispatch] = React.useState(initialSettingsState);
  // ! Proxy
  // Dispatcher to Main process
  const globalDispatch = (action: PersistentSettingsAction) => {
    // IPC
    ipcRenderer.invoke('global-dispatch', action);
  };

  React.useEffect(() => {
    // Add listener that is invoked when global store in Main process is changed
    const dispatch = (event: Electron.IpcRendererEvent, state: SettingsState) => {
      // Copy GlobalState from Main process to this Renderer process
      localDispatch(state);
    };
    ipcRenderer.on('globalStoreChanged', dispatch);
    const cleanup = () => {
      ipcRenderer.off('globalStoreChanged', dispatch);
    };
    return cleanup;
  }, []);

  const [state, dispatch]: SettingsDialogProvider = React.useReducer(
    SettingsDialogReducer,
    {
      activeSettingId: props.defaultSettingId,
      previousActiveSettingId: '',
    }
  );

  return (
    <GlobalContext.Provider value={[globalState, globalDispatch]}>
      <SettingsDialogContext.Provider value={[state, dispatch]}>
        {props.children}
      </SettingsDialogContext.Provider>
    </GlobalContext.Provider>
  );
};
