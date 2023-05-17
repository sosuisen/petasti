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
import { selectorDialog } from './selector';

export interface DashboardProps {
  items: MenuItemProps[];
}

export function DashboardPages (props: DashboardProps) {
  const dialogState = useSelector(selectorDialog);
  let activePage: JSX.Element;
  const pages = props.items.reduce((result, item, index) => {
    let page: JSX.Element;
    if (item.id === 'search') {
      page = <DashboardPageSearch item={item} index={index} />;
    }
    else if (item.id === 'space') {
      page = <DashboardPageSpace item={item} index={index} />;
    }

    if (dialogState.activeDashboardName === item.id) {
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
