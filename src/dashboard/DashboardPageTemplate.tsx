/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import { useSelector } from 'react-redux';
import { ColorName, uiColors } from '../modules_common/color';
import { MenuItemProps } from './MenuItem';
import './DashboardPageTemplate.css';
import { getRandomInt } from '../modules_common/utils';
import { dashboardStore } from './store';
import { DashboardChangePageAction } from './dashboard_local.types';
import { selectorDialog } from './selector';

export interface DashboardPageTemplateProps {
  item: MenuItemProps;
  index: number;
  children: React.ReactNode;
}

export function DashboardPageTemplate (props: DashboardPageTemplateProps) {
  const dialogState = useSelector(selectorDialog);
  const style = (color: ColorName) => ({
    backgroundColor: uiColors[color],
    zIndex: dialogState.activeDashboardName === props.item.id ? 200 : 150 - props.index,
    width: props.item.width + 'px',
    height: props.item.height + 'px',
  });

  let activeState = 'inactivePage';
  if (dialogState.activeDashboardName === props.item.id) {
    activeState = 'activePage';
  }
  else if (dialogState.previousActiveDashboardName === props.item.id) {
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
