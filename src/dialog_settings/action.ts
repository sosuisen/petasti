/**
 * Petasti
 * © 2022 Hidekazu Kubota
 */
import { InfoState, SettingsState } from '../modules_common/store.types';

export interface InfoInitAction {
  type: 'info-init';
  payload: InfoState;
}

export type InfoAction = InfoInitAction;

export interface SettingsInitAction {
  type: 'settings-init';
  payload: SettingsState;
}

export interface SettingsLanguageUpdateAction {
  type: 'settings-language-update';
  payload: string;
}

export interface SettingsSyncEnabledUpdateAction {
  type: 'settings-sync-enabled-update';
  payload: boolean;
}

export interface SettingsSyncRemoteUrlUpdateAction {
  type: 'settings-sync-remote-url-update';
  payload: string;
}

export interface SettingsSyncPersonalAccessTokenUpdateAction {
  type: 'settings-sync-personal-access-token-update';
  payload: string;
}

export interface SettingsSyncIntervalUpdateAction {
  type: 'settings-sync-interval-update';
  payload: number;
}

export interface SettingsSyncAfterChangesUpdateAction {
  type: 'settings-sync-after-changes-update';
  payload: boolean;
}

export interface SettingsSaveZOrderUpdateAction {
  type: 'settings-save-zorder-update';
  payload: boolean;
}

export interface SettingsDataStorePathUpdateAction {
  type: 'settings-data-store-path-update';
  payload: string;
}

export type SettingsAction =
  | SettingsInitAction
  | SettingsLanguageUpdateAction
  | SettingsSyncEnabledUpdateAction
  | SettingsSyncRemoteUrlUpdateAction
  | SettingsSyncPersonalAccessTokenUpdateAction
  | SettingsSyncIntervalUpdateAction
  | SettingsSyncAfterChangesUpdateAction
  | SettingsSaveZOrderUpdateAction
  | SettingsDataStorePathUpdateAction;
