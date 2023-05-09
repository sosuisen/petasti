/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import './SearchResult.css';
import { ColorName, uiColors } from '../modules_common/color';
import { dashboardStore } from './store';

export interface SearchResultProps {
  click: (value: any) => void;
  text: string;
  type: string;
  index: number;
  selected: boolean;
}

export function SearchResult (props: SearchResultProps) {
  const handleClick = () => {};

  const style = (color: ColorName) => ({
    backgroundColor: uiColors[color],
  });

  let color: ColorName = 'white';
  if (props.selected) {
    color = 'green';
  }

  const onMouseEnter = () => {
    dashboardStore.dispatch({
      type: 'search-result-select',
      payload: props.index,
    });
  };

  const onMouseLeave = () => {
    dashboardStore.dispatch({
      type: 'search-result-select',
      payload: -1,
    });
  };

  return (
    <div
      id={`search-result-${props.index}`}
      style={style(color)}
      styleName={`tag ${props.selected ? 'selected' : ''}`}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {props.type}:{props.text}
    </div>
  );
}
