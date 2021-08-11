/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import './RemovableTag.css';
import { ColorName, uiColors } from '../modules_common/color';

export interface RemovableTagProps {
  value: string;
  click: Function;
}

export const RemovableTag = (props: RemovableTagProps) => {
  const style = (color: ColorName) => ({
    backgroundColor: uiColors[color],
  });

  const color: ColorName = 'green';
  const handleClick = () => {
    props.click(props.value);
  };

  return (
    <div style={style(color)} styleName={'tag'}>
      <div styleName='label'>{props.value}</div>
      <div styleName='removeButton' onClick={handleClick}>
        <i className='fas fa-times'></i>
      </div>
    </div>
  );
};
