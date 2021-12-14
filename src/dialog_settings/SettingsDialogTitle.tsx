/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import './SettingsDialogTitle.css';
import { useSelector } from 'react-redux';
import { MessageLabel } from '../modules_common/i18n';
import { localContext, LocalProvider } from './store_local';
import { MenuItemProps } from './MenuItem';
import { darkenHexColor, strengthenHexColor, uiColors } from '../modules_common/color';
import { selectorMessages } from './selector';

export interface SettingsDialogTitleProps {
  title: MessageLabel;
  items: MenuItemProps[];
}

export function SettingsDialogTitle (props: SettingsDialogTitleProps) {
  const messages = useSelector(selectorMessages);

  const [localState, dispatch]: LocalProvider = React.useContext(localContext);

  const activeItem: MenuItemProps | undefined = props.items.find(
    item => item.id === localState.activeSettingId
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
            <span style={{ color: '#909090' }} className='fas fa-cog'></span>&nbsp;&nbsp;
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
