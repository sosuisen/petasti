/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { APP_SCHEME } from './const';

export const getLocationFromUrl = (cardUrl: string): string => {
  const rex = new RegExp(`^(${APP_SCHEME}:\\/\\/.+/)[^/]+?$`);
  const result = cardUrl.match(rex);
  if (result && result.length === 2) {
    return result[1];
  }
  return '';
};

export const getWorkspaceIdFromUrl = (cardUrl: string): string => {
  const rex = new RegExp(`^${APP_SCHEME}:\\/\\/[^/]+?\\/.+?\\/ws\\/([^/]+?)\\/`);
  const result = cardUrl.match(rex);
  if (result && result.length === 2) {
    return result[1];
  }
  return '';
};

export const getIdFromUrl = (cardUrl: string): string => {
  const paths = cardUrl.split('/');
  return paths[paths.length - 1];
};
