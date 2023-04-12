/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { SettingsDialogState } from '../modules_common/store.types';

export const selectorMessages = (state: SettingsDialogState) => {
  return state.info.messages;
};

export const selectorAppInfo = (state: SettingsDialogState) => {
  return state.info.appinfo;
};

export const selectorLanguage = (state: SettingsDialogState) => {
  return state.settings.language;
};

export const selectorDataStorePath = (state: SettingsDialogState) => {
  return state.settings.dataStorePath;
};

export const selectorSettings = (state: SettingsDialogState) => {
  return state.settings;
};
