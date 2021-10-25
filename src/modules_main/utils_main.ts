/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { BrowserWindow, dialog } from 'electron';
import { DIALOG_BUTTON } from '../modules_common/const';
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

export const showConfirmDialog = (
  target: BrowserWindow | undefined,
  type: 'info' | 'error' | 'question',
  buttonLabels: MessageLabel[],
  label: MessageLabel,
  ...msg: string[]
): number => {
  const buttons: string[] = buttonLabels.map(buttonLabel => MESSAGE(buttonLabel));
  if (target instanceof BrowserWindow) {
    return dialog.showMessageBoxSync(target, {
      type,
      buttons: buttons,
      defaultId: DIALOG_BUTTON.cancel,
      cancelId: DIALOG_BUTTON.cancel,
      message: MESSAGE(label, ...msg),
    });
  }

  return dialog.showMessageBoxSync({
    type,
    buttons: buttons,
    defaultId: DIALOG_BUTTON.cancel,
    cancelId: DIALOG_BUTTON.cancel,
    message: MESSAGE(label, ...msg),
  });
};
