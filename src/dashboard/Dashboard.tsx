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

export interface DashboardProps {
  title: MessageLabel;
  menu: MenuListProps;
}

export function Dashboard (props: DashboardProps) {
  return (
    <div styleName='dashboard'>
      <Provider store={dashboardStore}>
        <DashboardTitle title={props.title} items={props.menu.items} />
        <MenuList items={props.menu.items} />
        <DashboardPages items={props.menu.items} />
      </Provider>
    </div>
  );
}
