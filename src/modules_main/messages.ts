/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { MessageLabel, Messages } from '../modules_common/i18n';

// Utility for i18n
let messages: Messages;
export const MESSAGE = (label: MessageLabel, ...args: string[]) => {
  // let message: string = noteStore.info.messages[label];
  let message: string = messages[label];
  if (args) {
    args.forEach((replacement, index) => {
      const variable = '$' + (index + 1); // $1, $2, ...
      message = message.replace(variable, replacement);
    });
  }
  return message;
};

export const setMessages = (mes: Messages) => {
  messages = mes;
};
