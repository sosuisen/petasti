/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import { Provider } from 'react-redux';
import { MenuList, MenuListProps } from './MenuList';
import { SettingPages } from './SettingPages';
import './SettingsDialog.css';
import { MessageLabel } from '../modules_common/i18n';
import { SettingsDialogTitle } from './SettingsDialogTitle';
import { settingsDialogStore } from './store';
import { LocalContext, LocalProvider, LocalReducer } from './localStore';

export interface SettingsDialogProps {
  title: MessageLabel;
  menu: MenuListProps;
  defaultSettingId: string;
}

export const SettingsDialog = (props: SettingsDialogProps) => {
  const [state, dispatch]: LocalProvider = React.useReducer(LocalReducer, {
    activeSettingId: props.defaultSettingId,
    previousActiveSettingId: '',
  });
  return (
    <div styleName='settingsDialog'>
      <Provider store={settingsDialogStore}>
        <LocalContext.Provider value={[state, dispatch]}>
          <SettingsDialogTitle title={props.title} items={props.menu.items} />
          <MenuList items={props.menu.items} />
          <SettingPages items={props.menu.items} />
        </LocalContext.Provider>
      </Provider>
    </div>
  );
};
