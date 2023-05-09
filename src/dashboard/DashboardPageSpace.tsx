/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import { useSelector } from 'react-redux';
import './DashboardPageSpace.css';
import { useEffect, useRef } from 'react';
import { MenuItemProps } from './MenuItem';
import { DashboardPageTemplate } from './DashboardPageTemplate';
import { selectorMessages, selectorSearchResultNote } from './selector';
import { SearchResult } from './SearchResult';
import window from './window';
import { dashboardStore } from './store';
import { localContext, LocalProvider } from './store_local';
import { openAnotherTab } from './utils';
import { uiColors } from '../modules_common/color';

export interface DashboardPageSpaceProps {
  item: MenuItemProps;
  index: number;
}

export function DashboardPageSpace (props: DashboardPageSpaceProps) {
  const messages = useSelector(selectorMessages);
  const searchResult = useSelector(selectorSearchResultNote);
  const [state, dispatch]: LocalProvider = React.useContext(localContext);
  const inputEl = useRef(null);

  const postfix = '-note';

  useEffect(() => {
    if (state.activeDashboardId === props.item.id) {
      // @ts-ignore
      if (inputEl.current) inputEl.current.focus();
    }
  }, [state.activeDashboardId]);

  useEffect(() => {
    window.api.db({
      command: 'get-all-notes',
    });
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
    if (keyword === '') {
      window.api.db({
        command: 'get-all-notes',
      });
    }
    else {
      window.api.db({
        command: 'search-note',
        data: keyword,
      });
    }
    document.getElementById('resultAreaNote')!.scrollTop = 0;
  };
  const debouncedSearchFieldChanged = debounce(searchFieldChanged);

  const onSearchFieldChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = event.target.value;
    debouncedSearchFieldChanged(keyword);
  };

  const setScrollTop = (selected: number) => {
    const resultArea = document.getElementById('resultAreaNote')!;
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
    if (event.ctrlKey && event.key === 'k') {
      openAnotherTab(dispatch, 'search');
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
          type: 'search-result-select-note',
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
          type: 'search-result-select-note',
          payload: searchResult.selected - 1,
        });
      }

      setTimeout(() => {
        const field = document.getElementById('searchFieldNote')! as HTMLInputElement;
        const len = field.value.length;
        field.setSelectionRange(len, len);
      }, 100);
    }
  };

  const results = searchResult.list.map((result, index) => (
    <SearchResult
      text={result.text}
      type={result.type}
      url={result.url}
      index={index}
      selected={index === searchResult.selected}
      hasCard={false}
    ></SearchResult>
  ));

  window.api.dashboard({
    command: 'dashboard-create-note',
  });
  const newSpaceButtonOnClick = () => {};

  return (
    <DashboardPageTemplate item={props.item} index={props.index}>
      <button
        styleName='newSpaceButton'
        onClick={newSpaceButtonOnClick}
        style={{
          backgroundColor: uiColors.yellow,
        }}
      >
        <i className='fas fa-plus-circle'></i>&nbsp;&nbsp;
        <span>{messages.noteNew}</span>
      </button>
      <input
        ref={inputEl}
        type='text'
        id='searchFieldNote'
        styleName='searchField'
        placeholder={messages.dashboardInputSpace}
        onChange={onSearchFieldChanged}
        onKeyDown={onSearchFieldKeyDown}
      ></input>
      <div id='resultAreaNote' styleName='resultArea'>
        {results}
      </div>
    </DashboardPageTemplate>
  );
}
