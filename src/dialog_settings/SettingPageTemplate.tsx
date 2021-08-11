/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import {
  SettingsDialogAction,
  SettingsDialogContext,
  SettingsDialogProvider,
} from './StoreProvider';
import { ColorName, uiColors } from '../modules_common/color';
import { MenuItemProps } from './MenuItem';
import './SettingPageTemplate.css';
import { getRandomInt } from '../modules_common/utils';

export interface SettingPageTemplateProps {
  item: MenuItemProps;
  index: number;
  children: React.ReactNode;
}

export const SettingPageTemplate = (props: SettingPageTemplateProps) => {
  const [settingsDialogState, dispatch]: SettingsDialogProvider = React.useContext(
    SettingsDialogContext
  );
  const style = (color: ColorName) => ({
    backgroundColor: uiColors[color],
    zIndex: settingsDialogState.activeSettingId === props.item.id ? 200 : 150 - props.index,
    width: props.item.width + 'px',
    height: props.item.height + 'px',
  });

  let activeState = 'inactivePage';
  if (settingsDialogState.activeSettingId === props.item.id) {
    activeState = 'activePage';
  }
  else if (settingsDialogState.previousActiveSettingId === props.item.id) {
    activeState = 'previousActivePage';
  }

  const handleClick = () => {
    if (activeState !== 'activePage') {
      // Play if page changes
      (document.getElementById(
        'soundEffect0' + getRandomInt(1, 4)
      ) as HTMLAudioElement).play();
      const action: SettingsDialogAction = {
        type: 'UpdateActiveSetting',
        activeSettingId: props.item.id,
      };
      dispatch(action);
    }
  };

  return (
    <div
      style={style(props.item.color)}
      styleName='settingPageTemplate'
      className={activeState}
      onClick={handleClick}
    >
      {props.children}
    </div>
  );
};
