/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { contextBridge, ipcRenderer, MouseInputEvent } from 'electron';
import { ChangedFile } from 'git-documentdb';
import { DatabaseCommand } from '../modules_common/db.types';
import { CardBody, CardSketch, Geometry, SavingTarget } from '../modules_common/types';

contextBridge.exposeInMainWorld('api', {
  /**
   * Command from Renderer process
   */
  db: (command: DatabaseCommand) => {
    return ipcRenderer.invoke('db', command);
  },

  alertDialog: (url: string, message: string) => {
    return ipcRenderer.invoke('alert-dialog', url, message);
  },
  blurAndFocusWithSuppressEvents: (url: string) => {
    return ipcRenderer.invoke('blur-and-focus-with-suppress-events', url);
  },
  blurAndFocusWithSuppressFocusEvents: (url: string) => {
    return ipcRenderer.invoke('blur-and-focus-with-suppress-focus-events', url);
  },
  createCard: (
    sketchUrl: string | undefined,
    cardBody: Partial<CardBody>,
    cardSketch: Partial<CardSketch>
  ): Promise<void> => {
    return ipcRenderer.invoke('create-card', sketchUrl, cardBody, cardSketch);
  },
  confirmDialog: (url: string, buttonLabels: string[], message: string) => {
    return ipcRenderer.invoke('confirm-dialog', url, buttonLabels, message);
  },
  deleteCardSketch: (url: string) => {
    return ipcRenderer.invoke('delete-card-sketch', url);
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
  updateCardSketch: (sketchUrl: string, cardSketch: CardSketch, target: SavingTarget) => {
    return ipcRenderer.invoke('update-card-sketch', sketchUrl, cardSketch, target);
  },
  updateCardBody: (sketchUrl: string, cardBody: CardBody, target: SavingTarget) => {
    return ipcRenderer.invoke('update-card-body', sketchUrl, cardBody, target);
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
ipcRenderer.on('card-focused', (event: Electron.IpcRendererEvent, zIndex: number) =>
  window.postMessage({ command: 'card-focused', zIndex }, 'file://')
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

ipcRenderer.on('move-by-hand', (event: Electron.IpcRendererEvent, geometry: Geometry) =>
  window.postMessage({ command: 'move-by-hand', geometry }, 'file://')
);
ipcRenderer.on(
  'render-card',
  (
    event: Electron.IpcRendererEvent,
    sketchUrl,
    cardBody: CardBody,
    cardSketch: CardSketch
  ) =>
    window.postMessage(
      { command: 'render-card', sketchUrl, cardBody, cardSketch },
      'file://'
    )
);
ipcRenderer.on('resize-by-hand', (event: Electron.IpcRendererEvent, geometry: Geometry) =>
  window.postMessage({ command: 'resize-by-hand', geometry }, 'file://')
);
ipcRenderer.on('send-to-back', (event: Electron.IpcRendererEvent, zIndex: number) =>
  window.postMessage({ command: 'send-to-back', zIndex }, 'file://')
);
ipcRenderer.on('set-lock', (event: Electron.IpcRendererEvent, locked: boolean) => {
  window.postMessage({ command: 'set-lock', locked }, 'file://');
});
ipcRenderer.on('zoom-in', () => window.postMessage({ command: 'zoom-in' }, 'file://'));
ipcRenderer.on('zoom-out', () => window.postMessage({ command: 'zoom-out' }, 'file://'));

ipcRenderer.on(
  'sync-card-sketch',
  (event: Electron.IpcRendererEvent, changedFile: ChangedFile, enqueueTime: string) =>
    window.postMessage({ command: 'sync-card-sketch', changedFile, enqueueTime }, 'file://')
);

ipcRenderer.on(
  'sync-card-body',
  (event: Electron.IpcRendererEvent, changedFile: ChangedFile, enqueueTime: string) =>
    window.postMessage({ command: 'sync-card-body', changedFile, enqueueTime }, 'file://')
);
