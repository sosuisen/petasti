/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import { useSelector } from 'react-redux';
import './DashboardPageSearch.css';
import { MenuItemProps } from './MenuItem';
import { DashboardPageTemplate } from './DashboardPageTemplate';
import { selectorMessages } from './selector';
import window from './window';

export interface DashboardPageSearchProps {
  item: MenuItemProps;
  index: number;
}

export function DashboardPageSearch (props: DashboardPageSearchProps) {
  const messages = useSelector(selectorMessages);

  const onSearchFieldChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = event.target.value;
    window.api.db({
      command: 'search-note-and-card',
      data: keyword,
    });
  };

  return (
    <DashboardPageTemplate item={props.item} index={props.index}>
      <input
        type='text'
        id='searchField'
        styleName='searchField'
        placeholder={messages.dashboardSpaceOrKeyword}
        onChange={onSearchFieldChanged}
      ></input>
    </DashboardPageTemplate>
  );
}
