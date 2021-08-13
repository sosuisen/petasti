/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import './SettingPages.css';
import { SettingPageSave } from './SettingPageSave';
import { SettingPageSync } from './SettingPageSync';
import { SettingPageLanguage } from './SettingPageLanguage';
import { localContext, LocalProvider } from './localStore';
import { MenuItemProps } from './MenuItem';
import { SettingPageAbout } from './SettingPageAbout';

export interface SettingsProps {
  items: MenuItemProps[];
}

export const SettingPages = (props: SettingsProps) => {
  const [localState]: LocalProvider = React.useContext(localContext);
  let ActivePage;
  const pages = props.items.map((item, index) => {
    let Page;
    if (item.id === 'save') {
      Page = <SettingPageSave item={item} index={index} />;
    }
    else if (item.id === 'sync') {
      Page = <SettingPageSync item={item} index={index} />;
    }
    else if (item.id === 'language') {
      Page = <SettingPageLanguage item={item} index={index} />;
    }
    else if (item.id === 'about') {
      Page = <SettingPageAbout item={item} index={index} />;
    }

    if (localState.activeSettingId === item.id) {
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
