/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { BrowserWindow, dialog } from 'electron';
import { MessageLabel } from '../modules_common/i18n';
import { MESSAGE } from './messages';

export const showDialog = (
  target: BrowserWindow | undefined,
  type: 'info' | 'error' | 'question',
  label: MessageLabel,
  ...msg: string[]
) => {
  const message = MESSAGE(label, ...msg);

  if (target instanceof BrowserWindow) {
    dialog.showMessageBoxSync(target, {
      type,
      buttons: ['OK'],
      message,
    });
  }
  else {
    dialog.showMessageBoxSync({
      type,
      buttons: ['OK'],
      message,
    });
  }
};
