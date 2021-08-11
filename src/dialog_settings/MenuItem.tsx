/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import './MenuItem.css';
import { ColorName, uiColors } from '../modules_common/color';
import {
  GlobalContext,
  GlobalProvider,
  SettingsDialogAction,
  SettingsDialogContext,
  SettingsDialogProvider,
} from './StoreProvider';
import { MessageLabel } from '../modules_common/i18n';
import { getRandomInt } from '../modules_common/utils';

export interface MenuItemProps {
  id: string;
  label: MessageLabel;
  icon: string;
  color: ColorName;
  width: number;
  height: number;
}

export interface MenuItemPropsInternal {
  index: number;
}

export const MenuItem = (props: MenuItemProps & MenuItemPropsInternal) => {
  const [globalState] = React.useContext(GlobalContext) as GlobalProvider;
  const [state, dispatch]: SettingsDialogProvider = React.useContext(SettingsDialogContext);

  const MESSAGE = (label: MessageLabel) => {
    return globalState.temporal.messages[label];
  };

  const isActive = state.activeSettingId === props.id;
  const isPrevActive = state.previousActiveSettingId === props.id;

  const menuHeight = 50;
  const style = (color: ColorName) => ({
    backgroundColor: uiColors[color],
    zIndex: isActive ? 190 : props.index,
  });

  let currentAudio: HTMLAudioElement;
  const handleClick = () => {
    // Play if page changes
    if (currentAudio !== undefined) {
      currentAudio.pause();
    }
    currentAudio = document.getElementById(
      'soundEffect0' + getRandomInt(1, 4)
    ) as HTMLAudioElement;
    currentAudio.play();

    const action: SettingsDialogAction = {
      type: 'UpdateActiveSetting',
      activeSettingId: props.id,
    };
    dispatch(action);
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
        {MESSAGE(props.label)}
      </span>
    </h2>
  );
};
