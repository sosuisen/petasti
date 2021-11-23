/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { Dispatch } from 'redux';
import {
  DatabaseDataStorePathUpdate,
  DatabaseLanguageUpdate,
  DatabaseSyncAfterChangesUpdate,
  DatabaseSyncEnabledUpdate,
  DatabaseSyncIntervalUpdate,
  DatabaseSyncPersonalAccessTokenUpdate,
  DatabaseSyncRemoteUrlUpdate,
} from '../modules_common/db.types';
import { SettingsDialogState } from '../modules_common/store.types';
import {
  SettingsDataStorePathUpdateAction,
  SettingsLanguageUpdateAction,
  SettingsSyncAfterChangesUpdateAction,
  SettingsSyncEnabledUpdateAction,
  SettingsSyncIntervalUpdateAction,
  SettingsSyncPersonalAccessTokenUpdateAction,
  SettingsSyncRemoteUrlUpdateAction,
} from './action';
import window from './window';

export const settingsLanguageUpdateCreator = (lang: string) => {
  return async function (dispatch: Dispatch<any>, getState: () => SettingsDialogState) {
    const settingsAction: SettingsLanguageUpdateAction = {
      type: 'settings-language-update',
      payload: lang,
    };
    dispatch(settingsAction);
    const cmd: DatabaseLanguageUpdate = {
      command: 'db-language-update',
      data: lang,
    };
    await window.api.db(cmd);
  };
};

export const settingsSyncEnableUpdateCreator = (bool: boolean) => {
  return async function (dispatch: Dispatch<any>, getState: () => SettingsDialogState) {
    const settingsAction: SettingsSyncEnabledUpdateAction = {
      type: 'settings-sync-enabled-update',
      payload: bool,
    };
    dispatch(settingsAction);
    const cmd: DatabaseSyncEnabledUpdate = {
      command: 'db-sync-enabled-update',
      data: bool,
    };
    await window.api.db(cmd);
  };
};

export const settingsSyncRemoteUrlUpdateCreator = (remoteUrl: string) => {
  return async function (dispatch: Dispatch<any>, getState: () => SettingsDialogState) {
    const settingsAction: SettingsSyncRemoteUrlUpdateAction = {
      type: 'settings-sync-remote-url-update',
      payload: remoteUrl,
    };
    dispatch(settingsAction);
    const cmd: DatabaseSyncRemoteUrlUpdate = {
      command: 'db-sync-remote-url-update',
      data: remoteUrl,
    };
    await window.api.db(cmd);
  };
};

export const settingsSyncPersonalAccessTokenUpdateCreator = (token: string) => {
  return async function (dispatch: Dispatch<any>, getState: () => SettingsDialogState) {
    const settingsAction: SettingsSyncPersonalAccessTokenUpdateAction = {
      type: 'settings-sync-personal-access-token-update',
      payload: token,
    };
    dispatch(settingsAction);
    const cmd: DatabaseSyncPersonalAccessTokenUpdate = {
      command: 'db-sync-personal-access-token-update',
      data: token,
    };
    await window.api.db(cmd);
  };
};

export const settingsSyncIntervalUpdateCreator = (interval: number) => {
  return async function (dispatch: Dispatch<any>, getState: () => SettingsDialogState) {
    const settingsAction: SettingsSyncIntervalUpdateAction = {
      type: 'settings-sync-interval-update',
      payload: interval * 1000,
    };
    dispatch(settingsAction);
    const cmd: DatabaseSyncIntervalUpdate = {
      command: 'db-sync-interval-update',
      data: interval * 1000,
    };
    await window.api.db(cmd);
  };
};

export const settingsSyncAfterChangesUpdateCreator = (bool: boolean) => {
  return async function (dispatch: Dispatch<any>, getState: () => SettingsDialogState) {
    const settingsAction: SettingsSyncAfterChangesUpdateAction = {
      type: 'settings-sync-after-changes-update',
      payload: bool,
    };
    dispatch(settingsAction);
    const cmd: DatabaseSyncAfterChangesUpdate = {
      command: 'db-sync-after-changes-update',
      data: bool,
    };
    await window.api.db(cmd);
  };
};

export const settingsDataStorePathUpdateCreator = (saveDir: string) => {
  return async function (dispatch: Dispatch<any>, getState: () => SettingsDialogState) {
    const settingsAction: SettingsDataStorePathUpdateAction = {
      type: 'settings-data-store-path-update',
      payload: saveDir,
    };
    dispatch(settingsAction);
    const cmd: DatabaseDataStorePathUpdate = {
      command: 'db-data-store-path-update',
      data: saveDir,
    };
    await window.api.db(cmd);
  };
};
