/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */

export type DashboardChangeNote = {
  command: 'dashboard-change-note';
  url: string;
};

export type DashboardCommand = DashboardChangeNote;
