/**
 * TreeStickies
 * © 2022 Hidekazu Kubota
 */

export const UI_COLOR_DARKENING_RATE = 0.96;

export interface CardColors {
  yellow: string;
  red: string;
  green: string;
  blue: string;
  orange: string;
  purple: string;
  white: string;
  gray: string;
  lightgray: string;
  transparent: string;
}

export type ColorName = keyof CardColors;

export const cardColors: CardColors = {
  yellow: '#fff8d0',
  red: '#ffcac4',
  green: '#edffc4',
  blue: '#d1e1ff',
  orange: '#ffdd9e',
  purple: '#f8d0ff',
  white: '#ffffff',
  gray: '#e0e0e0',
  lightgray: '#f8f8f8',
  transparent: '#ffffff',
};

export const uiColors: CardColors = {
  yellow: '#ffffa0',
  red: '#ffb0b0',
  green: '#d0ffd0',
  blue: '#d0d0ff',
  orange: '#ffb000',
  purple: '#ffd0ff',
  white: '#ffffff',
  gray: '#d0d0d0',
  lightgray: '#f0f0f0',
  transparent: '#ffffff',
};

// eslint-disable-next-line complexity
export const strengthenHexColor = (
  colorHEX: string,
  darkRate = UI_COLOR_DARKENING_RATE
): string => {
  if (darkRate > 1 || darkRate < 0) {
    console.error(`Invalid darkRate: ${darkRate}`);
    return '#000000';
  }
  const res = colorHEX.match(/#(\w\w)(\w\w)(\w\w)/);
  let red = parseInt(RegExp.$1, 16);
  let green = parseInt(RegExp.$2, 16);
  let blue = parseInt(RegExp.$3, 16);
  if (res === null || isNaN(red) || isNaN(blue) || isNaN(blue)) {
    console.error(`Invalid HEX color format: ${colorHEX}`);
    return '#000000';
  }
  const sorted = [red, green, blue].sort();
  const max = sorted[2];
  const middle = sorted[1];
  const min = sorted[0];

  if (max === middle && middle === min) {
    red = Math.round(red * darkRate * darkRate);
    green = Math.round(green * darkRate * darkRate);
    blue = Math.round(blue * darkRate * darkRate);
  }
  else {
    red =
      red === max
        ? Math.round(red * darkRate)
        : red === middle
          ? Math.round(red * darkRate * darkRate)
          : Math.round(red * darkRate * darkRate * darkRate);
    green =
      green === max
        ? Math.round(green * darkRate)
        : green === middle
          ? Math.round(green * darkRate * darkRate)
          : Math.round(green * darkRate * darkRate * darkRate);
    blue =
      blue === max
        ? Math.round(blue * darkRate)
        : blue === middle
          ? Math.round(blue * darkRate * darkRate)
          : Math.round(blue * darkRate * darkRate * darkRate);
  }
  if (red > 255 || green > 255 || red > 255) {
    console.error(`Invalid HEX value: ${colorHEX}`);
    return '#000000';
  }

  return (
    '#' +
    red.toString(16).padStart(2, '0') +
    green.toString(16).padStart(2, '0') +
    blue.toString(16).padStart(2, '0')
  );
};

export const darkenHexColor = (
  colorHEX: string,
  darkRate = UI_COLOR_DARKENING_RATE
): string => {
  if (darkRate > 1 || darkRate < 0) {
    console.error(`Invalid darkRate: ${darkRate}`);
    return '#000000';
  }
  const res = colorHEX.match(/#(\w\w)(\w\w)(\w\w)/);
  let red = parseInt(RegExp.$1, 16);
  let green = parseInt(RegExp.$2, 16);
  let blue = parseInt(RegExp.$3, 16);
  if (res === null || isNaN(red) || isNaN(blue) || isNaN(blue)) {
    console.error(`Invalid HEX color format: ${colorHEX}`);
    return '#000000';
  }
  red = Math.round(red * darkRate);
  green = Math.round(green * darkRate);
  blue = Math.round(blue * darkRate);
  if (red > 255 || green > 255 || red > 255) {
    console.error(`Invalid HEX value: ${colorHEX}`);
    return '#000000';
  }

  return (
    '#' +
    red.toString(16).padStart(2, '0') +
    green.toString(16).padStart(2, '0') +
    blue.toString(16).padStart(2, '0')
  );
};

export const convertHexColorToRgba = (colorHEX: string, opacity = 1.0): string => {
  const res = colorHEX.match(/^#(\w\w)(\w\w)(\w\w)$/);
  const red = parseInt(RegExp.$1, 16);
  const green = parseInt(RegExp.$2, 16);
  const blue = parseInt(RegExp.$3, 16);
  if (res === null || isNaN(red) || isNaN(blue) || isNaN(blue)) {
    console.error(`Invalid HEX color format: ${colorHEX}`);
    return 'rgba(255,255,255,1.0)';
  }
  if (red > 255 || green > 255 || red > 255) {
    console.error(`Invalid HEX value: ${colorHEX}`);
    return '#000000';
  }

  const rgba = 'rgba(' + red + ',' + green + ',' + blue + ',' + opacity + ')';

  return rgba;
};
