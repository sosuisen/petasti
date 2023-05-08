/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import './SearchResult.css';
import { ColorName, uiColors } from '../modules_common/color';

export interface SearchResultProps {
  click: (value: any) => void;
  text: string;
  type: string;
  selected: boolean;
}

export function SearchResult (props: SearchResultProps) {
  const handleClick = () => {};

  const style = (color: ColorName) => ({
    backgroundColor: uiColors[color],
  });

  let color: ColorName = 'yellow';
  if (props.selected) {
    color = 'green';
  }

  return (
    <div
      style={style(color)}
      styleName={`tag ${props.selected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      {props.type}:{props.text}
    </div>
  );
}
