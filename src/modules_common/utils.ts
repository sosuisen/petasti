/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { monotonicFactory } from 'ulid';
import { APP_SCHEME } from './const';

const ulid = monotonicFactory();

export const sleep = (msec: number) =>
  new Promise<void>(resolve => setTimeout(resolve, msec));

export const getCurrentDateAndTime = (): string => {
  // Returns UTC date with 'YYYY-MM-DD HH:mm:ss' format
  return new Date().toISOString().replace(/^(.+?)T(.+?)\..+?$/, '$1 $2');
};

export const getRandomInt = (min: number, max: number) => {
  // Get int value between min <= x < max
  min = Math.ceil(min);
  max = Math.floor(max);
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min)) + min;
};

export const generateId = () => {
  return ulid(Date.now());
};

export const generateNewCardId = () => {
  return 'c' + ulid(Date.now());
};

export const getLocationFromUrl = (cardUrl: string): string => {
  const rex = new RegExp(`^(${APP_SCHEME}:\\/\\/.+/)[^/]+?$`);
  const result = cardUrl.match(rex);
  if (result && result.length === 2) {
    return result[1];
  }
  return '';
};

export const getNoteIdFromUrl = (url: string): string => {
  const rexNote = new RegExp(`^${APP_SCHEME}:\\/\\/[^/]+?\\/note/(n.+?)$`); // treestickies://local/note/noteID
  const resultNote = url.match(rexNote);
  if (resultNote && resultNote.length === 2) {
    return resultNote[1];
  }
  const rexCard = new RegExp(`^${APP_SCHEME}:\\/\\/[^/]+?\\/(n.+?)\\/`); // treestickies://local/noteID/(cardID|noteID)
  const resultCard = url.match(rexCard);
  if (resultCard && resultCard.length === 2) {
    return resultCard[1];
  }
  return '';
};

export const getCardIdFromUrl = (cardUrl: string): string => {
  const paths = cardUrl.split('/');
  return paths[paths.length - 1];
};
