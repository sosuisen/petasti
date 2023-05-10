/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import './DashboardPages.css';
import { useSelector } from 'react-redux';
import { MenuItemProps } from './MenuItem';
import { DashboardPageSpace } from './DashboardPageSpace';
import { DashboardPageSearch } from './DashboardPageSearch';
import { dashboardStore } from './store';
import { selectorPage } from './selector';

export interface DashboardProps {
  items: MenuItemProps[];
}

export function DashboardPages (props: DashboardProps) {
  const pageState = useSelector(selectorPage);
  let activePage: JSX.Element;
  const pages = props.items.reduce((result, item, index) => {
    let page: JSX.Element;
    if (item.id === 'search') {
      page = <DashboardPageSearch item={item} index={index} />;
    }
    else if (item.id === 'space') {
      page = <DashboardPageSpace item={item} index={index} />;
    }

    if (pageState.activeDashboardName === item.id) {
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
