/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import './SettingPageSync.css';
import { useDispatch, useSelector } from 'react-redux';
import { MenuItemProps } from './MenuItem';
import { SettingPageTemplate } from './SettingPageTemplate';
import { MessageLabel } from '../modules_common/i18n';
import { selectorMessages, selectorSettings } from './selector';

export interface SettingPageSecurityProps {
  item: MenuItemProps;
  index: number;
}

export const SettingPageSync = (props: SettingPageSecurityProps) => {
  const dispatch = useDispatch();

  const messages = useSelector(selectorMessages);
  const settings = useSelector(selectorSettings);

  return (
    <SettingPageTemplate item={props.item} index={props.index}>
      <p>{messages.securityDetailedText}</p>
      <div styleName='urls'></div>
    </SettingPageTemplate>
  );
};
