/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import './MenuItem.css';
import { useSelector } from 'react-redux';
import { ColorName, uiColors } from '../modules_common/color';
import { LocalAction, localContext, LocalProvider } from './store_local';
import { MessageLabel } from '../modules_common/i18n';
import { getRandomInt } from '../modules_common/utils';
import { selectorMessages } from './selector';
import { openAnotherTab } from './utils';

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
  const [state, dispatch]: LocalProvider = React.useContext(localContext);

  const isActive = state.activeDashboardId === props.id;
  const isPrevActive = state.previousActiveDashboardId === props.id;

  const menuHeight = 50;
  const style = (color: ColorName) => ({
    backgroundColor: uiColors[color],
    zIndex: isActive ? 190 : props.index,
  });

  const handleClick = () => {
    openAnotherTab(dispatch, props.id);
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
