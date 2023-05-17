/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import './MenuItem.css';
import { useSelector } from 'react-redux';
import { ColorName, uiColors } from '../modules_common/color';
import { MessageLabel } from '../modules_common/i18n';
import { selectorDialog, selectorMessages } from './selector';
import { openAnotherTab } from './utils';
import { dashboardStore } from './store';

export interface MenuItemProps {
  id: string;
  label: MessageLabel;
  icon: string;
  color: ColorName;
  width: number;
  height: number;
  shortcut: string;
}

export interface MenuItemPropsInternal {
  index: number;
}

export function MenuItem (props: MenuItemProps & MenuItemPropsInternal) {
  const messages = useSelector(selectorMessages);
  const dialogState = useSelector(selectorDialog);

  const isActive = dialogState.activeDashboardName === props.id;
  const isPrevActive = dialogState.previousActiveDashboardName === props.id;

  const menuHeight = 50;
  const style = (color: ColorName) => ({
    backgroundColor: uiColors[color],
    zIndex: isActive ? 190 : props.index,
  });

  const handleClick = () => {
    openAnotherTab(props.id);
  };

  return (
    <h2
      id={props.id}
      styleName={`menuItem ${
        isActive ? 'activeItem' : isPrevActive ? 'previousActiveItem' : 'inactiveItem'
      }`}
      onClick={isActive ? () => {} : handleClick}
      style={style(props.color)}
    >
      <span styleName={`icon ${isActive ? 'activeIcon' : 'inactiveIcon'}`}>
        <i className={props.icon}></i>
      </span>
      <span styleName={`title ${isActive ? 'activeTitle' : 'inactiveTitle'}`}>
        {messages[props.label]}
      </span>
      <span styleName={`shortcut ${isActive ? 'activeShortcut' : 'inactiveShortcut'}`}>
        {props.shortcut}
      </span>
    </h2>
  );
}
