/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import './SettingPages.css';
import { SettingPageSave } from './SettingPageSave';
import { SettingPageSync } from './SettingPageSync';
import { SettingPageLanguage } from './SettingPageLanguage';
import { localContext, LocalProvider } from './store_local';
import { MenuItemProps } from './MenuItem';
import { SettingPageAbout } from './SettingPageAbout';

export interface SettingsProps {
  items: MenuItemProps[];
}

export function SettingPages (props: SettingsProps) {
  const [localState]: LocalProvider = React.useContext(localContext);
  let activePage: JSX.Element;
  const pages = props.items.reduce((result, item, index) => {
    let page: JSX.Element;
    if (item.id === 'save') {
      page = <SettingPageSave item={item} index={index} />;
    }
    else if (item.id === 'sync') {
      page = <SettingPageSync item={item} index={index} />;
    }
    else if (item.id === 'language') {
      page = <SettingPageLanguage item={item} index={index} />;
    }
    else if (item.id === 'about') {
      page = <SettingPageAbout item={item} index={index} />;
    }

    if (localState.activeSettingId === item.id) {
      activePage = page!;
    }
    else {
      result.push(page!);
    }
    return result;
  }, [] as JSX.Element[]);
  return (
    <div styleName='settingPages'>
      {activePage!}
      {pages}
    </div>
  );
}
