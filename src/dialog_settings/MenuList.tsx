/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import { MenuItem, MenuItemProps } from './MenuItem';
import './MenuList.css';

export interface MenuListProps {
  items: MenuItemProps[];
}

export function MenuList (props: MenuListProps) {
  return (
    <div styleName='menuList'>
      {props.items.map((item, index) => (
        <MenuItem
          key={item.id}
          id={item.id}
          label={item.label}
          icon={item.icon}
          color={item.color}
          index={index}
          width={item.width}
          height={item.height}
        />
      ))}
    </div>
  );
}
