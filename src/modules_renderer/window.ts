/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { DatabaseCommand } from '../modules_common/db.types';
import { MessageLabel } from '../modules_common/i18n';
import { CardBody, CardSketch } from '../modules_common/types';

interface WindowWithAPI extends Window {
  api: {
    db: (command: DatabaseCommand) => Promise<any>;
    alertDialog: (url: string, label: MessageLabel) => Promise<void>;
    blurAndFocusWithSuppressEvents: (url: string) => Promise<void>;
    blurAndFocusWithSuppressFocusEvents: (url: string) => Promise<void>;
    createCard: (
      sketchUrl: string | undefined,
      cardBody: Partial<CardBody>,
      cardSketch: Partial<CardSketch>
    ) => Promise<void>;
    confirmDialog: (
      url: string,
      buttonLabels: MessageLabel[],
      label: MessageLabel
    ) => Promise<number>;
    deleteCard: (url: string) => Promise<void>;
    deleteCardSketch: (url: string) => Promise<void>;
    finishLoad: (url: string) => Promise<void>;
    finishRenderCard: (url: string) => Promise<void>;
    focus: (url: string) => Promise<void>;
    getUuid: () => Promise<string>;
    updateCardSketch: (sketchUrl: string, cardSketch: CardSketch) => Promise<void>;
    updateCardBody: (sketchUrl: string, cardBody: CardBody) => Promise<void>;
    sendLeftMouseDown: (url: string, x: number, y: number) => Promise<void>;
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
