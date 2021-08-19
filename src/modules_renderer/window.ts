/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { MessageLabel } from '../modules_common/i18n';
import { CardProp, CardPropStatus } from '../modules_common/types';
import { PersistentStoreAction } from '../modules_common/actions';

interface WindowWithAPI extends Window {
  api: {
    alertDialog: (url: string, label: MessageLabel) => Promise<void>;
    blurAndFocusWithSuppressEvents: (url: string) => Promise<void>;
    blurAndFocusWithSuppressFocusEvents: (url: string) => Promise<void>;
    bringToFront: (url: string) => Promise<number>;
    createCard: (subsetOfCardPropSerializable: Record<string, any>) => Promise<string>;
    confirmDialog: (
      url: string,
      buttonLabels: MessageLabel[],
      label: MessageLabel
    ) => Promise<number>;
    deleteAvatar: (url: string) => Promise<void>;
    deleteCard: (url: string) => Promise<void>;
    finishLoad: (url: string) => Promise<void>;
    finishRenderCard: (url: string) => Promise<void>;
    focus: (url: string) => Promise<void>;
    getUuid: () => Promise<string>;
    persistentStoreActionDispatcherFromRenderer: (
      action: PersistentStoreAction
    ) => Promise<void>;
    updateCard: (cardProp: CardProp) => Promise<void>;
    sendLeftMouseDown: (url: string, x: number, y: number) => Promise<void>;
    sendToBack: (url: string) => Promise<number>;
    setTitle: (url: string, title: string) => Promise<void>;
    setWindowSize: (
      url: string,
      width: number,
      height: number
    ) => Promise<{ x: number; y: number; width: number; height: number }>;
    setWindowPosition: (
      url: string,
      x: number,
      y: number
    ) => Promise<{ x: number; y: number; width: number; height: number }>;
  };
}
declare const window: WindowWithAPI;
export default window;
