/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import './DashboardPages.css';
import { localContext, LocalProvider } from './store_local';
import { MenuItemProps } from './MenuItem';
import { DashboardPageSpace } from './DashboardPageSpace';
import { DashboardPageSearch } from './DashboardPageSearch';

export interface DashboardProps {
  items: MenuItemProps[];
}

export function DashboardPages (props: DashboardProps) {
  const [localState]: LocalProvider = React.useContext(localContext);
  let activePage: JSX.Element;
  const pages = props.items.reduce((result, item, index) => {
    let page: JSX.Element;
    if (item.id === 'search') {
      page = <DashboardPageSearch item={item} index={index} />;
    }
    else if (item.id === 'space') {
      page = <DashboardPageSpace item={item} index={index} />;
    }

    if (localState.activeSettingId === item.id) {
      activePage = page!;
    }
    else {
      result.push(page!);
    }
    return result;
  }, [] as JSX.Element[]);
  return (
    <div styleName='dashboardPages'>
      {activePage!}
      {pages}
    </div>
  );
}
