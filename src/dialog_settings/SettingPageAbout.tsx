/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import { GlobalContext, GlobalProvider } from './StoreProvider';
import { MenuItemProps } from './MenuItem';
import { SettingPageTemplate } from './SettingPageTemplate';
import { MessageLabel } from '../modules_common/i18n';

export interface SettingPageAboutProps {
  item: MenuItemProps;
  index: number;
}

export const SettingPageAbout = (props: SettingPageAboutProps) => {
  const [globalState, globalDispatch] = React.useContext(GlobalContext) as GlobalProvider;
  const MESSAGE = (label: MessageLabel) => {
    return globalState.temporal.messages[label];
  };

  return (
    <SettingPageTemplate item={props.item} index={props.index}>
      <img src={globalState.temporal.app.iconDataURL}></img>
      <p>
        {globalState.temporal.app.name} {globalState.temporal.app.version}
      </p>
      <p>{MESSAGE('aboutCopyright')}</p>
      <p>
        <a href={MESSAGE('aboutAppUrl')} target='_blank'>
          {MESSAGE('aboutAppUrl')}
        </a>
      </p>
    </SettingPageTemplate>
  );
};
