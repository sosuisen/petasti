/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import './SettingPages.css';
import { SettingPageSave } from './SettingPageSave';
import { SettingPageSecurity } from './SettingPageSecurity';
import { SettingPageLanguage } from './SettingPageLanguage';
import { SettingsDialogContext, SettingsDialogProvider } from './StoreProvider';
import { MenuItemProps } from './MenuItem';
import { SettingPageAbout } from './SettingPageAbout';

export interface SettingsProps {
  items: MenuItemProps[];
}

export const SettingPages = (props: SettingsProps) => {
  const [settingsDialogState]: SettingsDialogProvider = React.useContext(
    SettingsDialogContext
  );
  let ActivePage;
  const pages = props.items.map((item, index) => {
    let Page;
    if (item.id === 'save') {
      Page = <SettingPageSave item={item} index={index} />;
    }
    else if (item.id === 'security') {
      Page = <SettingPageSecurity item={item} index={index} />;
    }
    else if (item.id === 'language') {
      Page = <SettingPageLanguage item={item} index={index} />;
    }
    else if (item.id === 'about') {
      Page = <SettingPageAbout item={item} index={index} />;
    }

    if (settingsDialogState.activeSettingId === item.id) {
      ActivePage = Page;
    }
    else {
      return Page;
    }
  });
  return (
    <div styleName='settingPages'>
      {ActivePage}
      {pages}
    </div>
  );
};
