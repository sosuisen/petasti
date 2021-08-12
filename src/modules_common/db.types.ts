/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
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

export type DatabaseCommand =
  | DatabaseSyncRemoteUrlUpdate
  | DatabaseSyncPersonalAccessTokenUpdate
  | DatabaseSyncIntervalUpdate
  | DatabaseLanguageUpdate
  | DatabaseDataStorePathUpdate;
