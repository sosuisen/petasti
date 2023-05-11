/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { ulid } from 'ulid';
import { monotonicFactory as monotonicFactoryHmtid } from 'hmtid';
import { APP_SCHEME, notebookDbName } from './const';
import { LabelStatus } from './types';

const hmtid = monotonicFactoryHmtid(undefined, '-', true);

export const bookRegExp = 'b\\d\\d\\d';

const getShortBookId = (bookId: string) => {
  const resultBook = bookId.match(/book(\d\d\d)/);
  if (resultBook && resultBook.length === 2) {
    return 'b' + resultBook[1];
  }
  return 'invalid_bookid';
};

export const sleep = (msec: number) =>
  new Promise<void>(resolve => setTimeout(resolve, msec));

export const getCurrentDateAndTime = (): string => {
  // Returns UTC date with 'YYYY-MM-DD HH:mm:ss' format
  return new Date().toISOString().replace(/^(.+?)T(.+?)\..+?$/, '$1 $2');
};

export const getCurrentLocalDate = (): string => {
  return getLocalDate(Date.now());
};

export const getLocalDate = (msec: number): string => {
  return new Date(msec - new Date().getTimezoneOffset() * 60 * 1000)
    .toISOString()
    .replace(/^(.+?)T.+?\..+?$/, '$1');
};

export const getCurrentLocalDateAndTime = (): string => {
  return getLocalDateAndTime(Date.now());
};

export const getLocalDateAndTime = (msec: number): string => {
  return new Date(msec - new Date().getTimezoneOffset() * 60 * 1000)
    .toISOString()
    .replace(/^(.+?)T(.+?)\..+?$/, '$1 $2');
};

export const getRandomInt = (min: number, max: number) => {
  // Get int value between min <= x < max
  min = Math.ceil(min);
  max = Math.floor(max);
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min)) + min;
};

export const generateUlid = () => {
  return ulid(Date.now());
};

export const generateNewCardId = () => {
  return 'c' + hmtid(Date.now());
};

export const getNoteIdFromUrl = (url: string): string => {
  const rexNote = new RegExp(`^${APP_SCHEME}:\\/\\/.+?\\/${bookRegExp}\\/(n[^/]+?)$`); // petast ://local/b001/noteID
  const resultNote = url.match(rexNote);
  if (resultNote && resultNote.length === 2) {
    return resultNote[1];
  }

  const rexView = new RegExp(
    `^${APP_SCHEME}:\\/\\/.+?\\/${bookRegExp}\\/(n[^/]+?)\\/c.+?$`
  ); // petasti://local/b001/noteID/cardID
  const resultView = url.match(rexView);
  if (resultView && resultView.length === 2) {
    return resultView[1];
  }
  return '';
};

export const getCardIdFromUrl = (url: string): string => {
  const rexView = new RegExp(
    `^${APP_SCHEME}:\\/\\/.+?\\/${bookRegExp}\\/n[^/]+?\\/(c.+?)$`
  ); // petasti://local/b001/noteID/cardID
  const resultView = url.match(rexView);
  if (resultView && resultView.length === 2) {
    return resultView[1];
  }

  const rexCard = new RegExp(`^${APP_SCHEME}:\\/\\/.+?\\/${bookRegExp}\\/(c.+?)$`); // petasti://local/b001/cardID
  const resultCard = url.match(rexCard);
  if (resultCard && resultCard.length === 2) {
    return resultCard[1];
  }
  return '';
};

export const getSketchIdFromUrl = (url: string): string => {
  const rexView = new RegExp(
    `^${APP_SCHEME}:\\/\\/.+?\\/${bookRegExp}\\/(n[^/]+?\\/c.+?)$`
  ); // petasti://local/001/noteID/cardID
  const resultView = url.match(rexView);
  if (resultView && resultView.length === 2) {
    return resultView[1];
  }
  return '';
};

export const getNoteUrl = (noteId: string): string => {
  return `${APP_SCHEME}://local/${getShortBookId(notebookDbName)}/${noteId}`;
};

export const getCardUrl = (cardId: string): string => {
  return `${APP_SCHEME}://local/${getShortBookId(notebookDbName)}/${cardId}`;
};

export const getSketchUrl = (noteId: string, cardId: string): string => {
  // petasti://local/noteID/cardID
  return `${APP_SCHEME}://local/${getShortBookId(notebookDbName)}/${noteId}/${cardId}`;
};

export const getSketchUrlFromSketchId = (sketchId: string): string => {
  // petasti://local/noteID/cardID
  return `${APP_SCHEME}://local/${getShortBookId(notebookDbName)}/${sketchId}`;
};

export const isLabelOpened = (status: LabelStatus): boolean => {
  if (status === 'openedLabel' || status === 'openedSticker') return true;
  return false;
};
