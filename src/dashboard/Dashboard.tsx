/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import { Provider } from 'react-redux';
import { MenuList, MenuListProps } from './MenuList';
import { DashboardPages } from './DashboardPages';
import './Dashboard.css';
import { MessageLabel } from '../modules_common/i18n';
import { DashboardTitle } from './DashboardTitle';
import { dashboardStore } from './store';
import { localContext, LocalProvider, localReducer } from './store_local';

export interface DashboardProps {
  title: MessageLabel;
  menu: MenuListProps;
  defaultSettingId: string;
}

export function Dashboard (props: DashboardProps) {
  const [state, dispatch]: LocalProvider = React.useReducer(localReducer, {
    activeSettingId: props.defaultSettingId,
    previousActiveSettingId: '',
  });
  return (
    <div styleName='dashboard'>
      <Provider store={dashboardStore}>
        <localContext.Provider value={[state, dispatch]}>
          <DashboardTitle title={props.title} items={props.menu.items} />
          <MenuList items={props.menu.items} />
          <DashboardPages items={props.menu.items} />
        </localContext.Provider>
      </Provider>
    </div>
  );
}
