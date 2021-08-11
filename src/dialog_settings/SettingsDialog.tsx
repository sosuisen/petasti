/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import { MenuList, MenuListProps } from './MenuList';
import { SettingPages } from './SettingPages';
import './SettingsDialog.css';
import { StoreProvider } from './StoreProvider';
import { MessageLabel } from '../modules_common/i18n';
import { SettingsDialogTitle } from './SettingsDialogTitle';

export interface SettingsDialogProps {
  title: MessageLabel;
  menu: MenuListProps;
  defaultSettingId: string;
}

export const SettingsDialog = (props: SettingsDialogProps) => {
  return (
    <div styleName='settingsDialog'>
      <StoreProvider defaultSettingId={props.defaultSettingId}>
        <SettingsDialogTitle title={props.title} items={props.menu.items} />
        <MenuList items={props.menu.items} />
        <SettingPages items={props.menu.items} />
      </StoreProvider>
    </div>
  );
};
