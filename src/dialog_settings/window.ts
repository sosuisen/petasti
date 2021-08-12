/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { DatabaseCommand } from '../modules_common/db.types';

interface WindowWithAPI extends Window {
  api: {
    db: (command: DatabaseCommand) => Promise<any>;
  };
}
declare const window: WindowWithAPI;
export default window;
