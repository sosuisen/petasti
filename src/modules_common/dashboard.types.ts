/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */

import { SearchResult } from './search.types';

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

export type DashboardCommand =
  | DashboardChangeNote
  | DashboardCreateNote
  | DashboardCloneCards;
