/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import { useSelector } from 'react-redux';
import { MenuItemProps } from './MenuItem';
import { DashboardPageTemplate } from './DashboardPageTemplate';
import { selectorMessages } from './selector';

export interface DashboardPageSpaceProps {
  item: MenuItemProps;
  index: number;
}

export function DashboardPageSpace (props: DashboardPageSpaceProps) {
  const messages = useSelector(selectorMessages);

  return (
    <DashboardPageTemplate item={props.item} index={props.index}>
      <p>
        <a href={messages.aboutAppUrl} target='_blank'>
          {messages.aboutAppUrl}
        </a>
      </p>
    </DashboardPageTemplate>
  );
}
