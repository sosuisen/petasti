/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import './DashboardTitle.css';
import { useSelector } from 'react-redux';
import { MessageLabel } from '../modules_common/i18n';
import { localContext, LocalProvider } from './store_local';
import { MenuItemProps } from './MenuItem';
import { darkenHexColor, strengthenHexColor, uiColors } from '../modules_common/color';
import { selectorMessages } from './selector';

export interface DashboardTitleProps {
  title: MessageLabel;
  items: MenuItemProps[];
}

export function DashboardTitle (props: DashboardTitleProps) {
  const messages = useSelector(selectorMessages);

  const [localState, dispatch]: LocalProvider = React.useContext(localContext);

  const activeItem: MenuItemProps | undefined = props.items.find(
    item => item.id === localState.activeDashboardId
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
    window.close();
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
