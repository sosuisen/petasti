/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { DashboardCommand } from '../modules_common/dashboard.types';
import { DatabaseCommand } from '../modules_common/db.types';

interface WindowWithAPI extends Window {
  api: {
    db: (command: DatabaseCommand) => Promise<any>;
    dashboard: (command: DashboardCommand) => Promise<any>;
  };
}
declare const window: WindowWithAPI;
export default window;
