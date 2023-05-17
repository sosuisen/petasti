/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import './DashboardTitle.css';
import { useSelector } from 'react-redux';
import { MessageLabel } from '../modules_common/i18n';
import { MenuItemProps } from './MenuItem';
import { darkenHexColor, strengthenHexColor, uiColors } from '../modules_common/color';
import { selectorMessages, selectorDialog } from './selector';
import window from './window';

export interface DashboardTitleProps {
  title: MessageLabel;
  items: MenuItemProps[];
}

export function DashboardTitle (props: DashboardTitleProps) {
  const messages = useSelector(selectorMessages);
  const dialogState = useSelector(selectorDialog);

  const activeItem: MenuItemProps | undefined = props.items.find(
    item => item.id === dialogState.activeDashboardName
  );
  let style;
  if (activeItem !== undefined) {
    style = {
      backgroundColor: strengthenHexColor(uiColors[activeItem.color], 0.9),
    };
  }
  else {
    style = {};
  }

  const close = () => {
    window.api.dashboard({
      command: 'dashboard-close',
    });
  };

  return (
    <div>
      <h1 styleName='pin' style={style}></h1>
      <h1 styleName='title'>
        <div styleName='draggable'>
          <div style={{ float: 'left' }}>
            <span style={{ color: '#909090' }} className='fas fa-tachometer-alt'></span>
            &nbsp;&nbsp;
            {messages[props.title]}
          </div>
        </div>
        <div styleName='closeButton' onClick={close}>
          <span className='fas fa-window-close'></span>
        </div>
      </h1>
    </div>
  );
}
