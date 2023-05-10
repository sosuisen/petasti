/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { DashboardCommand } from '../modules_common/dashboard.types';

interface WindowWithAPI extends Window {
  api: {
    dashboard: (command: DashboardCommand) => Promise<any>;
  };
}
declare const window: WindowWithAPI;
export default window;
