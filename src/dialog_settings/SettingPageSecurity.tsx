/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import './SettingPageSecurity.css';
import { GlobalContext, GlobalProvider } from './StoreProvider';
import { MenuItemProps } from './MenuItem';
import { SettingPageTemplate } from './SettingPageTemplate';
import { MessageLabel } from '../modules_common/i18n';
import { RemovableTag } from './RemovableTab';

export interface SettingPageSecurityProps {
  item: MenuItemProps;
  index: number;
}

export const SettingPageSecurity = (props: SettingPageSecurityProps) => {
  const [globalState, globalDispatcher] = React.useContext(GlobalContext) as GlobalProvider;
  const MESSAGE = (label: MessageLabel) => {
    return globalState.temporal.messages[label];
  };
  const handleClick = (value: string) => {
    globalDispatcher({
      type: 'navigationAllowedURLs-delete',
      payload: value,
    });
  };
  // globalState.navigationAllowedURLs is always sorted by alphabetical order in Reducer
  let urls = [<span>{MESSAGE('securityNoUrl')}</span>];
  if (globalState.persistent.navigationAllowedURLs.length > 0) {
    urls = globalState.persistent.navigationAllowedURLs.map(url => (
      <RemovableTag value={url} click={handleClick}></RemovableTag>
    ));
  }

  return (
    <SettingPageTemplate item={props.item} index={props.index}>
      <p>{MESSAGE('securityDetailedText')}</p>
      <div styleName='urls'>{urls}</div>
    </SettingPageTemplate>
  );
};
