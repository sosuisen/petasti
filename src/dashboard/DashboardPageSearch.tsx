/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import { useSelector } from 'react-redux';
import './DashboardPageSearch.css';
import { useEffect, useRef } from 'react';
import { MenuItemProps } from './MenuItem';
import { DashboardPageTemplate } from './DashboardPageTemplate';
import { selectorMessages, selectorSearchResultNoteAndCard } from './selector';
import window from './window';
import { SearchResult } from './SearchResult';
import { dashboardStore } from './store';
import { LocalAction, localContext, LocalProvider } from './store_local';
import { getRandomInt } from '../modules_common/utils';
import { openAnotherTab } from './utils';

export interface DashboardPageSearchProps {
  item: MenuItemProps;
  index: number;
}

export function DashboardPageSearch (props: DashboardPageSearchProps) {
  const messages = useSelector(selectorMessages);
  const searchResult = useSelector(selectorSearchResultNoteAndCard);
  const [state, dispatch]: LocalProvider = React.useContext(localContext);
  const inputEl = useRef(null);

  const postfix = '-note-and-card';

  useEffect(() => {
    if (state.activeDashboardId === props.item.id) {
      // @ts-ignore
      if (inputEl.current) inputEl.current.focus();
    }
  }, [state.activeDashboardId]);

  useEffect(() => {
    if (state.activeDashboardId === props.item.id) {
      // @ts-ignore
      if (inputEl.current) inputEl.current.focus();
    }
  }, []);

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
    document.getElementById('resultAreaNote')!.scrollTop = 0;
  };
  const debouncedSearchFieldChanged = debounce(searchFieldChanged);

  const onSearchFieldChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = event.target.value;
    debouncedSearchFieldChanged(keyword);
  };

  const setScrollTop = (selected: number) => {
    const resultArea = document.getElementById('resultArea')!;
    let resultHeight = 0;
    const margin = 3;
    for (let i = 0; i <= selected - 4; i++) {
      resultHeight += document.getElementById(`search-result${postfix}-${i}`)!.offsetHeight;
      resultHeight += margin;
    }
    resultArea.scrollTop = resultHeight;
  };

  // eslint-disable-next-line complexity
  const onSearchFieldKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey && event.key === 's') {
      openAnotherTab(dispatch, 'space');
    }
    else if (event.key === 'Enter') {
      const result = searchResult.list[searchResult.selected];
      if (result && result.type === 'note') {
        const url = result.url;
        window.api.dashboard({
          command: 'dashboard-change-note',
          url,
        });
      }
    }
    else if (event.key === 'ArrowDown') {
      if (searchResult.selected < searchResult.list.length - 1) {
        if (searchResult.selected > 2) {
          setScrollTop(searchResult.selected + 1);
        }

        dashboardStore.dispatch({
          type: 'search-result-select-note-and-card',
          payload: searchResult.selected + 1,
        });
      }
    }
    else if (event.key === 'ArrowUp') {
      if (searchResult.selected >= 0) {
        if (searchResult.selected > 2) {
          setScrollTop(searchResult.selected - 1);
        }
        dashboardStore.dispatch({
          type: 'search-result-select-note-and-card',
          payload: searchResult.selected - 1,
        });
      }

      setTimeout(() => {
        const field = document.getElementById('searchField')! as HTMLInputElement;
        const len = field.value.length;
        field.setSelectionRange(len, len);
      }, 100);
    }
  };

  const onCloneAllButtonClick = () => {
    window.api.dashboard({
      command: 'dashboard-clone-cards',
      data: searchResult.list.filter(result => result.type === 'card'),
    });
  };

  const results = searchResult.list.map((result, index: number) => (
    <SearchResult
      text={result.text}
      type={result.type}
      url={result.url}
      index={index}
      selected={index === searchResult.selected}
      hasCard={true}
    ></SearchResult>
  ));

  return (
    <DashboardPageTemplate item={props.item} index={props.index}>
      <input
        ref={inputEl}
        type='text'
        id='searchField'
        styleName='searchField'
        placeholder={messages.dashboardInputSpaceOrKeyword}
        onChange={onSearchFieldChanged}
        onKeyDown={onSearchFieldKeyDown}
      ></input>
      <div styleName='cloneAllButton' onClick={onCloneAllButtonClick}>
        <i className='fas fa-file-download'></i>
      </div>
      <div id='resultArea' styleName='resultArea'>
        {results}
      </div>
    </DashboardPageTemplate>
  );
}
