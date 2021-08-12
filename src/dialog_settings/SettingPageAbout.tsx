/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import { useSelector } from 'react-redux';
import { MenuItemProps } from './MenuItem';
import { SettingPageTemplate } from './SettingPageTemplate';
import { selectorAppInfo, selectorMessages } from './selector';

export interface SettingPageAboutProps {
  item: MenuItemProps;
  index: number;
}

export const SettingPageAbout = (props: SettingPageAboutProps) => {
  const messages = useSelector(selectorMessages);
  const appInfo = useSelector(selectorAppInfo);

  return (
    <SettingPageTemplate item={props.item} index={props.index}>
      <img src={appInfo.iconDataURL}></img>
      <p>
        {appInfo.name} {appInfo.version}
      </p>
      <p>{messages.aboutCopyright}</p>
      <p>
        <a href={messages.aboutAppUrl} target='_blank'>
          {messages.aboutAppUrl}
        </a>
      </p>
    </SettingPageTemplate>
  );
};
