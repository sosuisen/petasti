/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { contextBridge, ipcRenderer, MouseInputEvent } from 'electron';
import { ChangedFile } from 'git-documentdb';
import { DatabaseCommand } from '../modules_common/db.types';
import { CardBody, CardSketch, Geometry, RendererConfig } from '../modules_common/types';

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
  getCurrentDisplayRect: (x: number, y: number) => {
    return ipcRenderer.invoke('get-current-display-rect', x, y);
  },
  getUuid: () => {
    return ipcRenderer.invoke('get-uuid');
  },
  openURL: (url: string) => {
    return ipcRenderer.invoke('openURL', url);
  },
  sendLeftMouseDown: (url: string, x: number, y: number) => {
    const leftMouseDown: MouseInputEvent = {
      button: 'left',
      type: 'mouseDown',
      x,
      y,
    };
    /*
    const leftMouseUp: MouseInputEvent = {
      button: 'left',
      type: 'mouseUp',
      x,
      y,
    };
    */
    // return ipcRenderer.invoke('send-mouse-input', url, [leftMouseDown, leftMouseUp]);
    return ipcRenderer.invoke('send-mouse-input', url, [leftMouseDown]);
  },
  sendLeftMouseClick: (url: string, x: number, y: number) => {
    const leftMouseDown: MouseInputEvent = {
      button: 'left',
      type: 'mouseDown',
      x,
      y,
    };
    const leftMouseUp: MouseInputEvent = {
      button: 'left',
      type: 'mouseUp',
      x,
      y,
    };
    return ipcRenderer.invoke('send-mouse-input', url, [leftMouseDown, leftMouseUp]);
  },
  setWindowRect: (url: string, x: number, y: number, width: number, height: number) => {
    return ipcRenderer.invoke('set-window-rect', url, x, y, width, height);
  },
  setTitle: (url: string, title: string) => {
    return ipcRenderer.invoke('set-title', url, title);
  },
  windowMoved: (url: string) => {
    ipcRenderer.invoke('window-moved', url);
  },
  windowMoving: (
    url: string,
    mouseOffset: { mouseOffsetX: number; mouseOffsetY: number }
  ) => {
    ipcRenderer.invoke('window-moving', url, mouseOffset);
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
ipcRenderer.on(
  'card-focused',
  (
    event: Electron.IpcRendererEvent,
    zIndex: number | undefined,
    modifiedDate: string | undefined
  ) => window.postMessage({ command: 'card-focused', zIndex, modifiedDate }, 'file://')
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
  (event: Electron.IpcRendererEvent, geometry: Geometry, modifiedDate: string) =>
    window.postMessage({ command: 'move-by-hand', geometry, modifiedDate }, 'file://')
);
ipcRenderer.on(
  'render-card',
  (
    event: Electron.IpcRendererEvent,
    sketchUrl: string,
    cardBody: CardBody,
    cardSketch: CardSketch,
    config: RendererConfig
  ) =>
    window.postMessage(
      { command: 'render-card', sketchUrl, cardBody, cardSketch, config },
      'file://'
    )
);
ipcRenderer.on('resize-by-hand', (event: Electron.IpcRendererEvent, geometry: Geometry) =>
  window.postMessage({ command: 'resize-by-hand', geometry }, 'file://')
);
ipcRenderer.on(
  'send-to-back',
  (event: Electron.IpcRendererEvent, zIndex: number, modifiedDate: string) =>
    window.postMessage({ command: 'send-to-back', zIndex, modifiedDate }, 'file://')
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

ipcRenderer.on('transform-to-label', (event: Electron.IpcRendererEvent) =>
  window.postMessage({ command: 'transform-to-label' }, 'file://')
);

ipcRenderer.on('transform-from-label', (event: Electron.IpcRendererEvent) =>
  window.postMessage({ command: 'transform-from-label' }, 'file://')
);
