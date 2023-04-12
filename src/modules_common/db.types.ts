/**
 * Petasti
 * © 2022 Hidekazu Kubota
 */

import { CardBody, CardSketch } from './types';

/**
 * From card
 */

export type DatabaseCardBodyUpdate = {
  command: 'db-card-body-update';
  url: string;
  data: CardBody;
};

export type DatabaseCardSketchUpdate = {
  command: 'db-card-sketch-update';
  url: string;
  data: CardSketch;
};

/**
 * From settings dialog
 */

export type DatabaseExecSync = {
  command: 'db-exec-sync';
};

export type DatabaseSyncEnabledUpdate = {
  command: 'db-sync-enabled-update';
  data: boolean;
};

export type DatabaseSyncRemoteUrlUpdate = {
  command: 'db-sync-remote-url-update';
  data: string;
};

export type DatabaseSyncPersonalAccessTokenUpdate = {
  command: 'db-sync-personal-access-token-update';
  data: string;
};

export type DatabaseSyncIntervalUpdate = {
  command: 'db-sync-interval-update';
  data: number;
};

export type DatabaseSyncAfterChangesUpdate = {
  command: 'db-sync-after-changes-update';
  data: boolean;
};

export type DatabaseSaveZOrderUpdate = {
  command: 'db-save-zorder-update';
  data: boolean;
};

export type DatabaseLanguageUpdate = {
  command: 'db-language-update';
  data: string;
};

export type DatabaseDataStorePathUpdate = {
  command: 'db-data-store-path-update';
  data: string;
};

export type DatabaseTestSync = {
  command: 'db-test-sync';
};

export type DatabasePauseSync = {
  command: 'db-pause-sync';
};

export type DatabaseResumeSync = {
  command: 'db-resume-sync';
};

export type DatabaseExportData = {
  command: 'export-data';
};

export type DatabaseImportData = {
  command: 'import-data';
};

export type DatabaseCommand =
  | DatabaseCardBodyUpdate
  | DatabaseCardSketchUpdate
  | DatabaseExecSync
  | DatabaseSyncEnabledUpdate
  | DatabaseSyncRemoteUrlUpdate
  | DatabaseSyncPersonalAccessTokenUpdate
  | DatabaseSyncIntervalUpdate
  | DatabaseSyncAfterChangesUpdate
  | DatabaseSaveZOrderUpdate
  | DatabaseLanguageUpdate
  | DatabaseDataStorePathUpdate
  | DatabaseTestSync
  | DatabasePauseSync
  | DatabaseResumeSync
  | DatabaseExportData
  | DatabaseImportData;
