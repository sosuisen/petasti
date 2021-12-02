/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { BrowserWindow, dialog } from 'electron';
import { DIALOG_BUTTON } from '../modules_common/const';
import { allMessages, availableLanguages, MessageLabel } from '../modules_common/i18n';
import { MESSAGE } from './messages';

let regExpStr = '(';
for (let i = 0; i < availableLanguages.length; i++) {
  const lang = availableLanguages[i];
  regExpStr += allMessages[lang].residentNoteName;
  if (i === availableLanguages.length - 1) {
    regExpStr += ')';
  }
  else {
    regExpStr += '|';
  }
}
export const regExpResidentNote = new RegExp(regExpStr, 'i');

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
