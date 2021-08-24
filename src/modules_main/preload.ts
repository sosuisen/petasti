/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { contextBridge, ipcRenderer, MouseInputEvent } from 'electron';
import { CardProp, SavingTarget } from '../modules_common/types';

contextBridge.exposeInMainWorld('api', {
  /**
   * Command from Renderer process
   */
  alertDialog: (url: string, message: string) => {
    return ipcRenderer.invoke('alert-dialog', url, message);
  },
  blurAndFocusWithSuppressEvents: (url: string) => {
    return ipcRenderer.invoke('blur-and-focus-with-suppress-events', url);
  },
  blurAndFocusWithSuppressFocusEvents: (url: string) => {
    return ipcRenderer.invoke('blur-and-focus-with-suppress-focus-events', url);
  },
  bringToFront: (cardProp: CardProp): Promise<number> => {
    return ipcRenderer.invoke('bring-to-front', cardProp);
  },
  createCard: (cardProp: Partial<CardProp>): Promise<void> => {
    return ipcRenderer.invoke('create-card', cardProp);
  },
  confirmDialog: (url: string, buttonLabels: string[], message: string) => {
    return ipcRenderer.invoke('confirm-dialog', url, buttonLabels, message);
  },
  deleteCard: (url: string) => {
    return ipcRenderer.invoke('delete-workspace-card', url);
  },
  deleteCard: (url: string) => {
    return ipcRenderer.invoke('delete-card', url);
  },
  finishLoad: (url: string) => {
    return ipcRenderer.invoke('finish-load-' + url);
  },
  finishRenderCard: (url: string) => {
    return ipcRenderer.invoke('finish-render-card', url);
  },
  focus: (url: string) => {
    return ipcRenderer.invoke('focus', url);
  },
  getUuid: () => {
    return ipcRenderer.invoke('get-uuid');
  },
  updateCard: (cardProp: CardProp, target: SavingTarget) => {
    return ipcRenderer.invoke('update-card', cardProp, target);
  },
  sendLeftMouseDown: (url: string, x: number, y: number) => {
    const leftMouseDown: MouseInputEvent = {
      button: 'left',
      type: 'mouseDown',
      x: x,
      y: y,
    };
    return ipcRenderer.invoke('send-mouse-input', url, leftMouseDown);
  },
  setWindowSize: (url: string, width: number, height: number) => {
    return ipcRenderer.invoke('set-window-size', url, width, height);
  },
  setWindowPosition: (url: string, x: number, y: number) => {
    return ipcRenderer.invoke('set-window-position', url, x, y);
  },
  setTitle: (url: string, title: string) => {
    return ipcRenderer.invoke('set-title', url, title);
  },
});

/**
 * Command from Main process
 */
ipcRenderer.on('card-blurred', () =>
  window.postMessage({ command: 'card-blurred' }, 'file://')
);
ipcRenderer.on('card-close', () =>
  window.postMessage({ command: 'card-close' }, 'file://')
);
ipcRenderer.on('card-focused', () =>
  window.postMessage({ command: 'card-focused' }, 'file://')
);
ipcRenderer.on(
  'change-card-color',
  (event: Electron.IpcRendererEvent, backgroundColor: string, opacity: number) =>
    window.postMessage(
      {
        command: 'change-card-color',
        backgroundColor,
        opacity,
      },
      'file://'
    )
);

ipcRenderer.on(
  'move-by-hand',
  (event: Electron.IpcRendererEvent, bounds: Electron.Rectangle) =>
    window.postMessage({ command: 'move-by-hand', bounds }, 'file://')
);
ipcRenderer.on('render-card', (event: Electron.IpcRendererEvent, cardProp: CardProp) =>
  window.postMessage({ command: 'render-card', cardProp }, 'file://')
);
ipcRenderer.on(
  'resize-by-hand',
  (event: Electron.IpcRendererEvent, bounds: Electron.Rectangle) =>
    window.postMessage({ command: 'resize-by-hand', bounds }, 'file://')
);
ipcRenderer.on('send-to-back', (event: Electron.IpcRendererEvent, zIndex: number) =>
  window.postMessage({ command: 'send-to-back', zIndex }, 'file://')
);
ipcRenderer.on('set-lock', (event: Electron.IpcRendererEvent, locked: boolean) => {
  window.postMessage({ command: 'set-lock', locked }, 'file://');
});
ipcRenderer.on('zoom-in', () => window.postMessage({ command: 'zoom-in' }, 'file://'));
ipcRenderer.on('zoom-out', () => window.postMessage({ command: 'zoom-out' }, 'file://'));
