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
  return message;
};

export const setMessages = (mes: Messages) => {
  messages = mes;

  messageLabelsForRenderer.forEach(label => {
    messagesRenderer[label] = mes[label];
  });
};
