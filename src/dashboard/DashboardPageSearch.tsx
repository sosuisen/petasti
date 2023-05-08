/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import { useSelector } from 'react-redux';
import './DashboardPageSearch.css';
import { MenuItemProps } from './MenuItem';
import { DashboardPageTemplate } from './DashboardPageTemplate';
import { selectorMessages, selectorSearchResult } from './selector';
import window from './window';
import { SearchResult } from './SearchResult';

export interface DashboardPageSearchProps {
  item: MenuItemProps;
  index: number;
}

export function DashboardPageSearch (props: DashboardPageSearchProps) {
  const messages = useSelector(selectorMessages);
  const searchResult = useSelector(selectorSearchResult);

  const onSearchFieldChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = event.target.value;
    window.api.db({
      command: 'search-note-and-card',
      data: keyword,
    });
  };

  const handleClick = (value: string) => {
    // dispatch(settingsLanguageUpdateCreator(value));
  };

  const results = searchResult.list.map(result => (
    <SearchResult
      click={handleClick}
      text={result.text}
      type={result.type}
      selected={true}
    ></SearchResult>
  ));

  return (
    <DashboardPageTemplate item={props.item} index={props.index}>
      <input
        type='text'
        id='searchField'
        styleName='searchField'
        placeholder={messages.dashboardSpaceOrKeyword}
        onChange={onSearchFieldChanged}
      ></input>
      <div styleName='resultArea'>{results}</div>
    </DashboardPageTemplate>
  );
}
