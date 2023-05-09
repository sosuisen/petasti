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

  const debounce = <T extends (...args: any[]) => unknown>(
    callback: T,
    delay = 250
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args) => {
      clearTimeout(timeoutId);
      // eslint-disable-next-line node/no-callback-literal
      timeoutId = setTimeout(() => callback(...args), delay);
    };
  };

  const searchFieldChanged = (keyword: string) => {
    window.api.db({
      command: 'search-note-and-card',
      data: keyword,
    });
  };
  const debouncedSearchFieldChanged = debounce(searchFieldChanged);

  const onSearchFieldChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = event.target.value;
    debouncedSearchFieldChanged(keyword);
  };

  const handleClick = (value: string) => {
    // dispatch(settingsLanguageUpdateCreator(value));
  };

  const results = searchResult.list.map((result, index) => (
    <SearchResult
      click={handleClick}
      text={result.text}
      type={result.type}
      selected={index === searchResult.selected}
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
