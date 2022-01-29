/**
 * TreeStickies
 * © 2022 Hidekazu Kubota
 */
import * as React from 'react';
import './SelectableTag.css';
import { ColorName, uiColors } from '../modules_common/color';

export interface SelectableTagProps {
  click: (value: any) => void;
  label: string;
  value: string;
  selected: boolean;
}

export function SelectableTag (props: SelectableTagProps) {
  const handleClick = () => {
    if (!props.selected) {
      props.click(props.value);
    }
  };

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
      {props.label}
    </div>
  );
}
