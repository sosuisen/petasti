/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import { ColorName, uiColors } from '../modules_common/color';
import { MenuItemProps } from './MenuItem';
import './DashboardPageTemplate.css';
import { getRandomInt } from '../modules_common/utils';
import { dashboardStore } from './store';
import { DashboardChangePageAction } from './dashboard_local.types';
import { selectorPage } from './selector';
import { useSelector } from 'react-redux';

export interface DashboardPageTemplateProps {
  item: MenuItemProps;
  index: number;
  children: React.ReactNode;
}

export function DashboardPageTemplate (props: DashboardPageTemplateProps) {
  const pageState = useSelector(selectorPage);
  const style = (color: ColorName) => ({
    backgroundColor: uiColors[color],
    zIndex: pageState.activeDashboardName === props.item.id ? 200 : 150 - props.index,
    width: props.item.width + 'px',
    height: props.item.height + 'px',
  });

  let activeState = 'inactivePage';
  if (pageState.activeDashboardName === props.item.id) {
    activeState = 'activePage';
  }
  else if (pageState.previousActiveDashboardName === props.item.id) {
    activeState = 'previousActivePage';
  }

  const handleClick = () => {
    if (activeState !== 'activePage') {
      // Play if page changes
      (document.getElementById(
        'soundEffect0' + getRandomInt(1, 4)
      ) as HTMLAudioElement).play();
      const action: DashboardChangePageAction = {
        type: 'dashboard-change-page',
        payload: props.item.id,
      };
      dashboardStore.dispatch(action);
    }
  };

  return (
    <div
      style={style(props.item.color)}
      styleName='dashboardPageTemplate'
      className={activeState}
      onClick={handleClick}
    >
      {props.children}
    </div>
  );
}
