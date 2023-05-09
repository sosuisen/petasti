/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import './SearchResult.css';
import { ColorName, uiColors } from '../modules_common/color';
import { dashboardStore } from './store';
import window from './window';

export interface SearchResultProps {
  text: string;
  url: string;
  type: string;
  index: number;
  selected: boolean;
  hasCard: boolean;
}

export function SearchResult (props: SearchResultProps) {
  const handleClick = () => {
    if (props.type === 'note') {
      const url = props.url;
      window.api.dashboard({
        command: 'dashboard-change-note',
        url,
      });
    }
  };

  const postfix = props.hasCard ? '-note-and-card' : '-note';

  const style = (color: ColorName) => ({
    backgroundColor: uiColors[color],
  });

  let color: ColorName = 'white';
  if (props.selected) {
    color = 'green';
  }

  const onMouseEnter = () => {
    dashboardStore.dispatch({
      type: `search-result-select${postfix}`,
      payload: props.index,
    });
  };

  const onMouseLeave = () => {
    dashboardStore.dispatch({
      type: `search-result-select${postfix}`,
      payload: -1,
    });
  };

  return (
    <div
      id={`search-result${postfix}-${props.index}`}
      style={style(color)}
      styleName={`tag ${props.selected ? 'selected' : ''}`}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span
        style={props.type === 'note' ? { color: '#ff90f0' } : { color: '#e0b040' }}
        className={props.type === 'note' ? 'fas fa-th' : 'fab fa-flipboard'}
      ></span>
      &nbsp;&nbsp;
      {props.text}
    </div>
  );
}
