/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import {
  MessageLabel,
  messageLabelsForRenderer,
  Messages,
  MessagesRenderer,
} from '../modules_common/i18n';

// Utility for i18n
let messages: Messages;

let myOS: 'win32' | 'darwin' | 'linux' = 'win32';
if (process.platform === 'win32') {
  myOS = 'win32';
}
else if (process.platform === 'darwin') {
  myOS = 'darwin';
}
else {
  myOS = 'linux';
}

export const messagesRenderer: MessagesRenderer = ({} as unknown) as MessagesRenderer;

export const MESSAGE = (label: MessageLabel, ...args: string[]) => {
  // let message: string = note.info.messages[label];
  let message: string = messages[label];
  if (args) {
    args.forEach((replacement, index) => {
      const variable = '$' + (index + 1); // $1, $2, ...
      message = message.replace(variable, replacement);
    });
  }

  let ctrlOrCmd = 'Ctrl';
  if (myOS === 'darwin') ctrlOrCmd = 'Cmd';
  message = message.replace('CtrlOrCmd', ctrlOrCmd);

  let altOrOpt = 'Alt';
  if (myOS === 'darwin') altOrOpt = 'Opt';
  message = message.replace('AltOrOpt', altOrOpt);

  return message;
};

export const setMessages = (mes: Messages) => {
  messages = mes;

  messageLabelsForRenderer.forEach(label => {
    messagesRenderer[label] = mes[label];
  });
};
