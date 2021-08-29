/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { CardBody } from './types';

/**
 * From card
 */

export type DatabaseCardBodyUpdate = {
  command: 'db-card-body-update';
  data: CardBody;
};

export type DatabaseCardSketchUpdate = {
  command: 'db-card-sketch-update';
  data: CardBody;
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

export type DatabaseCommand =
  | DatabaseCardBodyUpdate
  | DatabaseCardSketchUpdate
  | DatabaseExecSync
  | DatabaseSyncEnabledUpdate
  | DatabaseSyncRemoteUrlUpdate
  | DatabaseSyncPersonalAccessTokenUpdate
  | DatabaseSyncIntervalUpdate
  | DatabaseLanguageUpdate
  | DatabaseDataStorePathUpdate
  | DatabaseTestSync
  | DatabasePauseSync
  | DatabaseResumeSync;
