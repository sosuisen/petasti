/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */

import { SearchResult } from '../dashboard/dashboard_local.types';

export type DashboardSearchNoteAndCard = {
  command: 'dashboard-search-note-and-card';
  data: string;
};

export type DashboardSearchNote = {
  command: 'dashboard-search-note';
  data: string;
};

export type DashboardGetAllNotes = {
  command: 'dashboard-get-all-notes';
};

export type DashboardGetReferences = {
  command: 'dashboard-get-references';
  data: string;
};

export type DashboardChangeNote = {
  command: 'dashboard-change-note';
  url: string;
};

export type DashboardCreateNote = {
  command: 'dashboard-create-note';
};

export type DashboardCloneCards = {
  command: 'dashboard-clone-cards';
  data: SearchResult[];
};

export type DashboardOpenCard = {
  command: 'dashboard-open-card';
  url: string;
};

export type DashboardClose = {
  command: 'dashboard-close';
};

export type DashboardCommand =
  | DashboardSearchNoteAndCard
  | DashboardSearchNote
  | DashboardGetAllNotes
  | DashboardGetReferences
  | DashboardChangeNote
  | DashboardCreateNote
  | DashboardCloneCards
  | DashboardOpenCard
  | DashboardClose;
