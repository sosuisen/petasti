/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { MessageLabelRenderer, MessagesRenderer } from '../modules_common/i18n';

// Utility for i18n
let messages: MessagesRenderer;

export const MESSAGE = (label: MessageLabelRenderer, ...args: string[]) => {
  // let message: string = note.info.messages[label];
  let message: string = messages[label];
  if (args) {
    args.forEach((replacement, index) => {
      const variable = '$' + (index + 1); // $1, $2, ...
      message = message.replace(variable, replacement);
    });
  }
  return message;
};

export const setMessages = (mes: MessagesRenderer) => {
  messages = mes;
};
