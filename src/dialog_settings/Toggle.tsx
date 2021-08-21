/**
 * Inventory Manager
 * Copyright (c) Hidekazu Kubota
 *
 * This source code is licensed under the Mozilla Public License Version 2.0
 * found in the LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useState } from 'react';
import './Toggle.css';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const styles = require('./Toggle.css');

type ToggleProps = {
  onChange: (bool: boolean) => void;
  checked: boolean;
  color: string;
  activeColor: string;
};
export function Toggle (props: ToggleProps) {
  const [toggleValue, setToggleValue] = useState(props.checked);
  const toggle = useRef<HTMLSpanElement>(null);
  function handleToggle () {
    if (props.onChange) props.onChange(!toggleValue);
    setToggleValue(!toggleValue);
    const toggleElement = (toggle.current as unknown) as HTMLSpanElement;
    toggleElement.classList.toggle(styles.toggled);
  }

  return (
    <span
      ref={toggle}
      onClick={handleToggle}
      styleName={props.checked ? 'toggled toggle-switch' : 'toggle-switch'}
      style={{ borderColor: props.color }}
    >
      <span
        styleName='toggle'
        style={{ backgroundColor: props.checked ? props.activeColor : props.color }}
      ></span>
    </span>
  );
}
