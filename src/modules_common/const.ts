/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { cardColors, darkenHexColor } from './color';
import { CardCondition, CardStyle, Geometry } from './types';

export const DIALOG_BUTTON = {
  error: -1,
  ok: 0,
  cancel: 1,
};

export const notebookDbName = 'book001'; // This will be variable in the next version.

// Ubuntu and mac cannot load .ico
// export const APP_ICON_NAME = 'tree-stickies-icon.ico';
export const APP_ICON_NAME = 'tree-stickies-icon-128x128.png';
export const APP_ICON_NAME_MONO = 'tree-stickies-icon-Template@2x.png';

export const APP_SCHEME = 'treestickies';

export const CARD_VERSION = '1.0';
export const DEFAULT_CARD_GEOMETRY: Geometry = {
  x: 70,
  y: 70,
  z: 0,
  width: 300,
  height: 300,
};
export const DEFAULT_CARD_CONDITION: CardCondition = {
  locked: false,
};

export const DEFAULT_CARD_STYLE: CardStyle = {
  uiColor: darkenHexColor(cardColors.yellow),
  backgroundColor: cardColors.yellow,
  opacity: 1.0,
  zoom: 1.0,
};

// export const DEFAULT_CARD_STYLE is in modules_main/card.ts

// Dragging is shaky when _DRAG_IMAGE_MARGIN is too small, especially just after loading a card.
// private _DRAG_IMAGE_MARGIN = 20;
export const DRAG_IMAGE_MARGIN = 50;

export const MINIMUM_WINDOW_WIDTH = 185; // 180 + shadowWidth
export const MINIMUM_WINDOW_HEIGHT = 80;

export const SETTINGS_DB_NAME = 'local_settings';

export const SCHEMA_VERSION = 0.1;
