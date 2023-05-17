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
import {
  selecterSearchText,
  selectorDialog,
  selectorMessages,
  selectorSearchResultNote,
} from './selector';
import { SearchResult } from './SearchResult';
import window from './window';
import { dashboardStore } from './store';
import { uiColors } from '../modules_common/color';
import { useDebounce } from './CustomHooks';

export interface DashboardPageSpaceProps {
  item: MenuItemProps;
  index: number;
}

export function DashboardPageSpace (props: DashboardPageSpaceProps) {
  const messages = useSelector(selectorMessages);
  const searchResult = useSelector(selectorSearchResultNote);
  const inputElm = useRef(null) as React.RefObject<HTMLInputElement>;
  const dialogState = useSelector(selectorDialog);
  const searchText = useSelector(selecterSearchText);
  const postfix = '-note';

  useEffect(() => {
    if (searchResult.prevSelected === -1) {
      if (searchResult.selected > 2) {
        setScrollTop(searchResult.selected);
      }
    }
  }, [searchResult]);

  useEffect(() => {
    if (dialogState.activeDashboardName === props.item.id) {
      // @ts-ignore
      if (inputElm.current) inputElm.current.focus();
    }
  }, [dialogState.activeDashboardName]);

  useEffect(() => {
    if (dialogState.isVisible && dialogState.activeDashboardName === props.item.id) {
      if (inputElm.current) inputElm.current.focus();
    }
  }, [dialogState.isVisible]);

  useEffect(() => {
    window.api.dashboard({
      command: 'dashboard-get-all-notes',
    });
  }, []);

  const searchFieldChanged = (keyword: string) => {
    if (keyword === '') {
      window.api.dashboard({
        command: 'dashboard-get-all-notes',
      });
    }
    else {
      window.api.dashboard({
        command: 'dashboard-search-note',
        data: keyword,
      });
    }
    document.getElementById('resultAreaNote')!.scrollTop = 0;
  };
  const debouncedSearchFieldChanged = useDebounce(searchFieldChanged);

  const onSearchFieldChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = event.target.value;

    dashboardStore.dispatch({
      type: 'dashboard-change-space-page-text',
      payload: keyword,
    });

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
    if (event.key === 'Enter') {
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
        if (searchResult.selected + 1 > 2) {
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
        if (searchResult.selected - 1 > 2) {
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

  const newSpaceButtonOnClick = () => {
    window.api.dashboard({
      command: 'dashboard-create-note',
    });
  };

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
        ref={inputElm}
        type='search'
        id='searchFieldNote'
        styleName='searchField'
        placeholder={messages.dashboardInputSpace}
        onChange={onSearchFieldChanged}
        onKeyDown={onSearchFieldKeyDown}
        value={searchText.spacePageText}
      ></input>
      <div id='resultAreaNote' styleName='resultArea'>
        {results}
      </div>
    </DashboardPageTemplate>
  );
}
