/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import { useSelector } from 'react-redux';
import './DashboardPageSearch.css';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MenuItemProps } from './MenuItem';
import { DashboardPageTemplate } from './DashboardPageTemplate';
import {
  selectorDialog,
  selectorMessages,
  selectorSearchResultNoteAndCard,
  selectorSearchText,
  selectorSelectedCard,
} from './selector';
import window from './window';
import { SearchResult } from './SearchResult';
import { SearchResult as SearchResultType } from './dashboard_local.types';

import { dashboardStore } from './store';
import { getCardUrl, getTextLabel } from '../modules_common/utils';
import { useDebounce } from './CustomHooks';

export interface DashboardPageSearchProps {
  item: MenuItemProps;
  index: number;
}

export function DashboardPageSearch (props: DashboardPageSearchProps) {
  const messages = useSelector(selectorMessages);
  const searchResult = useSelector(selectorSearchResultNoteAndCard);
  const inputElm = useRef(null) as React.RefObject<HTMLInputElement>;
  const dialogState = useSelector(selectorDialog);
  const selectedCard = useSelector(selectorSelectedCard);
  const searchText = useSelector(selectorSearchText);

  const postfix = '-note-and-card';

  useEffect(() => {
    if (Object.keys(selectedCard.card).length > 0 && selectedCard.refs.length === 0) {
      window.api.dashboard({
        command: 'dashboard-get-references',
        data: selectedCard.card._id,
      });
    }
  }, [selectedCard.card]);

  useEffect(() => {
    if (dialogState.activeDashboardName === props.item.id) {
      if (inputElm.current) inputElm.current.focus();
    }
  }, [dialogState.activeDashboardName]);

  useEffect(() => {
    if (dialogState.isVisible && dialogState.activeDashboardName === props.item.id) {
      if (inputElm.current) inputElm.current.focus();
    }
  }, [dialogState.isVisible]);

  const searchFieldChanged = (keyword: string) => {
    window.api.dashboard({
      command: 'dashboard-search-note-and-card',
      data: keyword,
    });
    document.getElementById('resultAreaNote')!.scrollTop = 0;
  };
  const debouncedSearchFieldChanged = useDebounce(searchFieldChanged);

  const onSearchFieldChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = event.target.value;

    dashboardStore.dispatch({
      type: 'dashboard-change-search-page-text',
      payload: keyword,
    });

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
    if (event.key === 'Enter') {
      const result = searchResult.list[searchResult.selected];
      if (result) {
        const url = result.url;
        if (result.type === 'note') {
          window.api.dashboard({
            command: 'dashboard-change-note',
            url,
          });
        }
        else if (result.type === 'card') {
          window.api.dashboard({
            command: 'dashboard-open-card',
            url,
          });
        }
      }
    }
    else if (event.key === 'ArrowDown') {
      if (searchResult.selected < searchResult.list.length - 1) {
        if (searchResult.selected + 1 > 2) {
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
        if (searchResult.selected - 1 > 2) {
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
      data: searchResult.list
        .filter(result => result.type === 'card')
        .map(result => result.url),
    });
  };

  const onCloseCardButtonClick = () => {
    dashboardStore.dispatch({
      type: 'set-selected-card',
      payload: {},
    });
  };

  const onCloneCardButtonClick = () => {
    window.api.dashboard({
      command: 'dashboard-clone-single-card',
      data: getCardUrl(selectedCard.card._id),
    });
  };

  const onCopyCardLinkButtonClick = () => {
    const link = `[${getTextLabel(selectedCard.card._body, 20, true)}](${getCardUrl(
      selectedCard.card._id
    )})`;
    navigator.clipboard.writeText(link);
  };

  const results = searchResult.list.map((result, index: number) => (
    <SearchResult
      text={getTextLabel(result.text, 300, false)}
      type={result.type}
      url={result.url}
      index={index}
      selected={index === searchResult.selected}
      hasCard={true}
    ></SearchResult>
  ));

  const references = selectedCard.refs
    .filter(ref => ref !== undefined && ref !== null)
    .map(ref => (
      <div styleName='ref'>
        <a href={ref.url} target='_blank'>
          {ref.noteName}
        </a>
      </div>
    ));

  return (
    <DashboardPageTemplate item={props.item} index={props.index}>
      <input
        ref={inputElm}
        type='search'
        id='searchField'
        styleName='searchField'
        placeholder={messages.dashboardInputSpaceOrKeyword}
        onChange={onSearchFieldChanged}
        onKeyDown={onSearchFieldKeyDown}
        value={searchText.searchPageText}
      ></input>
      <div styleName='cloneAllButton' onClick={onCloneAllButtonClick}>
        <i className='fas fa-file-download'></i>
      </div>
      <div id='resultArea' styleName='resultArea'>
        {results}
      </div>
      <div
        id='cardPanel'
        styleName={`cardPanel ${
          Object.keys(selectedCard.card).length > 0 ? 'visible' : 'hidden'
        }`}
      >
        <div id='cardPanelTool' styleName='cardPanelTool'>
          <div styleName='closeCardButton' onClick={onCloseCardButtonClick}>
            <span className='fas fa-window-close'></span>
          </div>
          <button
            title={messages.copyToCurrentSpace}
            styleName='cloneCardButton'
            onClick={onCloneCardButtonClick}
          >
            <span className='fas fa-file-download'></span>
          </button>
          <button
            title={messages.copyLink}
            styleName='copyCardLinkButton'
            onClick={onCopyCardLinkButtonClick}
          >
            <span className='fas fa-link'></span>
          </button>
        </div>
        <div id='cardArea' styleName='cardArea'>
          <ReactMarkdown
            children={selectedCard.card._body}
            linkTarget={'_blank'}
            remarkPlugins={[remarkGfm]}
            transformLinkUri={null}
          />
        </div>
        <div id='referenceArea' styleName='referenceArea'>
          {references.length > 0 ? references : messages.dashboardReferenceNotExist}
        </div>
      </div>
    </DashboardPageTemplate>
  );
}
