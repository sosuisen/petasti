/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

export interface ICardEditor {
  readonly hasCodeMode: boolean;
  skipSave: boolean;
  isCodeMode: boolean;
  isOpened: boolean;

  deleteSelection(): void;
  hasSelection(): boolean;
  getSelectedMarkdown(): string;

  getImageTag(id: string, src: string, width: number, height: number, alt: string): string;

  loadUI(cardCssStyle: CardCssStyle): Promise<void>; // A Promise resolves when required initialization is finished.

  showEditor(): Promise<void>;
  hideEditor(): void;

  startEdit(): void;
  endEdit(): Promise<void>;
  toggleCodeMode(): void;
  startCodeMode(): void;
  endCodeMode(): void;

  getScrollPosition(): { left: number; top: number };
  setScrollPosition(height: number, top: number): void;
  setZoom(): void;
  setSize(width?: number, height?: number): void;
  setColor(): void;

  createEditor(): Promise<void>;
  setData(data: string): void;
  getHTML(): Promise<string>;
  getLabelText(): string;
}

export type CardCssStyle = {
  borderWidth: number;
};

/*
export type ContentsFrameCommand =
  | 'overwrite-iframe'
  | 'click-parent'
  | 'contents-frame-loaded'
  | 'contents-frame-file-dropped';
*/
// Use iterable union instead of normal union type
// because ContentsFrameCommand is also used for runtime type check.
export const contentsFrameCommand = [
  'click-parent',
  'contents-frame-file-dropped',
  'check-initializing',
  'contents-frame-initialized',
  '',
] as const;
// ContentsFrameCommand is union. e.g) 'overwrite-iframe' | 'click-parent' | ...
// Use ContentsFrameCommand to check type.
// Use below to iterate ContentsFrameCommands:
//   for (const cmd of contentsFrameCommand) { ... }
type ContentsFrameCommand = typeof contentsFrameCommand[number];

export type InnerClickEvent = {
  x: number;
  y: number;
};

export type FileDropEvent = {
  name: string;
  path: string;
};

export type ContentsFrameMessage = {
  command: ContentsFrameCommand;
  arg: any;
};
