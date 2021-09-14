/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import {
  AnyRecord,
  Cmd,
  CmdKey,
  commandsCtx,
  CommandsReady,
  createCmdKey,
  defaultValueCtx,
  Editor,
  editorStateCtx,
  editorStateOptionsCtx,
  editorViewCtx,
  inputRulesCtx,
  keymapCtx,
  MilkdownPlugin,
  Parser,
  parserCtx,
  prosePluginsCtx,
  rootCtx,
  schemaCtx,
  serializerCtx,
} from '@milkdown/core';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { nord } from '@milkdown/theme-nord';
import {
  bulletList,
  commonmark,
  commonmarkNodes,
  commonmarkPlugins,
  listItem,
  PopListItem,
  SinkListItem,
  SplitListItem,
  SupportedKeys,
} from '@milkdown/preset-commonmark';
import { history } from '@milkdown/plugin-history';
import { emoji } from '@milkdown/plugin-emoji';
import { CardCssStyle, ICardEditor } from '../modules_common/types_cardeditor';
import {
  getRenderOffsetHeight,
  getRenderOffsetWidth,
  render,
  setRenderOffsetHeight,
  shadowHeight,
  shadowWidth,
} from './card_renderer';
import { DRAG_IMAGE_MARGIN } from '../modules_common/const';
import { sleep } from '../modules_common/utils';
import { convertHexColorToRgba, darkenHexColor } from '../modules_common/color';
import { saveCardColor } from './save';
import window from './window';
import { cardStore } from './card_store';
import { cardBodyUpdateCreator, cardGeometryUpdateCreator } from './card_action_creator';

type DefaultValue =
  | string
  | { type: 'html'; dom: HTMLElement }
  | { type: 'json'; value: AnyRecord };

export class CardEditorMarkdown implements ICardEditor {
  /**
   * Private
   */
  private _errorFailedToSetData = 'Failed to set data.';

  private _toolBarHeight = 28;

  private _startEditorFirstTime = true;

  private _cardCssStyle!: CardCssStyle; // cardCssStyle is set by loadUI()

  /**
   * Public
   */
  public hasCodeMode = true;
  public isCodeMode = false;

  public isOpened = false;

  private _isEditing = false;

  private _editor!: Editor;
  private _loadBody!: (body: string) => void;
  /**
   * queueSaveCommand
   * Queuing and execute only last save command to avoid frequent save.
   */
  execSaveCommandTimeout = 0;

  getImageTag = (
    id: string,
    src: string,
    width: number,
    height: number,
    alt: string
  ): string => {
    return `<img id="${id}" src="${src}" alt="${alt}" width="${width}" height="${height}" />`;
  };

  adjustEditorSizeFromImage2Plugin = async (imgWidth: number, imgHeight: number) => {};

  loadUI = async (_cardCssStyle: CardCssStyle): Promise<void> => {
    this._cardCssStyle = _cardCssStyle;

    const mdListener = {
      markdown: [
        (getMarkdown: () => string) => {
          console.log(getMarkdown());
        },
      ], // print Markdown
      // doc: [(proseNode: ProseNode) => console.log(proseNode)], // print Node of ProseMirror
    };

    const listItemNodes = commonmarkNodes.configure(listItem, {
      keymap: {
        [SupportedKeys.SinkListItem]: ['Tab', 'Alt-Shift-ArrowRight'],
        [SupportedKeys.PopListItem]: ['Shift-Tab', 'Alt-Shift-ArrowLeft'],
      },
    });

    const bulletListNodes = commonmarkNodes.configure(bulletList, {
      keymap: {
        [SupportedKeys.BulletList]: 'Tab',
      },
    });

    this._editor = await Editor.make()
      .config(ctx => {
        ctx.set(rootCtx, document.querySelector('#editor'));
        ctx.set(listenerCtx, mdListener);
      })
      .use(nord)
      .use(commonmark)
      .use(history)
      .use(listener)
      .use(emoji)
      .use(commonmarkPlugins)
      .use(listItemNodes)
      .use(bulletListNodes)
      .create();

    // Set default value of link target to _blank
    /*
      CKEDITOR.on('dialogDefinition', function (ev) {
        const dialogName = ev.data.name;
        const dialogDefinition = ev.data.definition;
        if (dialogName === 'link') {
          const targetTab = dialogDefinition.getContents('target');
          const targetField = targetTab.get('linkTargetType');
          targetField.default = '_blank';
        }
      });
      */

    // Change event
    /*
        CKEDITOR.instances.editor.on('change', async () => {
          const data = CKEDITOR.instances.editor.getData();
          if (cardStore.getState().body._body !== data) {
            await cardStore.dispatch(cardBodyUpdateCreator(data));

            render(['TitleBar']);
          }
        });
      */
  };

  private _imeWorkaround = async (): Promise<void> => {
    /**
     * This is workaround for Japanese IME & CKEditor on Windows.
     * IME window is unintentionally opened only at the first time of inputting Japanese.
     * Expected behavior is that IME always work inline on CKEditor.
     * A silly workaround is to blur and focus this browser window.
     */
    await window.api.blurAndFocusWithSuppressEvents(cardStore.getState().workState.url);
  };

  private _setData = (): void => {
    this._editor.action(ctx => {
      console.log('# setData replaces existing text');
      let body = cardStore.getState().body._body;
      if (!body) body = 'Hello, world!';

      const editorView = ctx.get(editorViewCtx);
      const parser = ctx.get(parserCtx);

      editorView.state.doc = parser('initial data')!;
      const tr = editorView.state.tr;
      // console.log(editorView.state.doc.toString());
      const newState = editorView.state.apply(
        tr.insertText(body, 0, editorView.state.doc.content.size)
      );
      editorView.updateState(newState);
    });
  };

  private _addDragAndDropEvent = () => {};

  showEditor = (): Promise<void> => {
    if (this.isOpened) {
      return Promise.resolve();
    }
    this._setData();

    const contents = document.getElementById('contents');
    if (contents) {
      contents.style.visibility = 'hidden';
    }

    const editor = document.getElementById('editor');
    if (editor) {
      editor.style.visibility = 'visible';
    }
    else {
      throw new Error('editor does not exist.');
    }

    // this._addDragAndDropEvent();

    this.isOpened = true;

    render(['TitleBar', 'EditorRect', 'EditorStyle']);

    return Promise.resolve();
  };

  hideEditor = () => {
    this.isOpened = false;
    // document.getElementById('contents')!.style.visibility = 'visible';
  };

  startEdit = () => {
    this._isEditing = true;
    render(['EditorStyle']);

    return Promise.resolve();

    /*
    if (this._startEditorFirstTime) {
      this._startEditorFirstTime = false;
      await this._imeWorkaround();
    }
    */

    // CKEDITOR.instances.editor.focus();
  };

  endEdit = (): Promise<string> => {
    this._isEditing = false;

    // Save data to AvatarProp

    const data = ''; // from milkdown
    /*
    clearTimeout(this.execSaveCommandTimeout);

    await cardStore.dispatch(cardBodyUpdateCreator(data));
    */

    // eslint-disable-next-line no-unused-expressions
    //    CKEDITOR.instances.editor.getSelection()?.removeAllRanges();

    return Promise.resolve(data);
  };

  toggleCodeMode = () => {
    if (!this.isCodeMode) {
      this.startCodeMode();
    }
    else {
      this.endCodeMode();
    }
  };

  startCodeMode = () => {
    this.isCodeMode = true;
    this.startEdit();
    render(['TitleBar', 'TitleBarStyle']);

    // CKEDITOR.instances.editor.focus();

    // In code mode, editor background color is changed to white.
  };

  endCodeMode = () => {
    this.isCodeMode = false;

    /*
     * Reset editor color to card color
     * and reset width and height of cke_wysiwyg_frame
     */
    render(['TitleBar', 'TitleBarStyle', 'EditorStyle', 'EditorRect']);

    // CKEDITOR.instances.editor.focus();
  };

  getScrollPosition = () => {
    // const left = CKEDITOR.instances.editor.document.$.scrollingElement!.scrollLeft;
    // const top = CKEDITOR.instances.editor.document.$.scrollingElement!.scrollTop;
    return { left: 0, top: 0 };
    // return { left, top };
  };

  setScrollPosition = (left: number, top: number) => {
    // CKEDITOR.instances.editor.document.$.scrollingElement!.scrollLeft = left;
    // CKEDITOR.instances.editor.document.$.scrollingElement!.scrollTop = top;
  };

  setZoom = () => {
    /*
    if (CKEDITOR.instances.editor.document && CKEDITOR.instances.editor.document.$.body) {
      // @ts-ignore
      CKEDITOR.instances.editor.document.$.body.style.zoom = `${
        cardStore.getState().sketch.style.zoom
      }`;
    }
    */
  };

  setSize = (
    width: number = cardStore.getState().sketch.geometry.width -
      this._cardCssStyle.borderWidth * 2 -
      shadowWidth,
    height: number = cardStore.getState().sketch.geometry.height -
      this._cardCssStyle.borderWidth * 2 -
      shadowHeight -
      document.getElementById('title')!.offsetHeight
  ): void => {
    // width of BrowserWindow (namely avatarProp.geometry.width) equals border + padding + content.

    const editor = document.getElementById('editor');
    if (editor) {
      editor.style.width = width + 'px';
      editor.style.height = height + 'px';
    }
    else {
      console.error(`Error in setSize: editor is undefined.`);
    }
    const milkdownEditor = document.querySelector('#editor .milkdown') as HTMLElement;
    if (milkdownEditor) {
      milkdownEditor.style.width = width + 'px';
      milkdownEditor.style.height = height + 'px';
    }
  };

  setColor = (): void => {
    let backgroundRgba = convertHexColorToRgba(
      cardStore.getState().sketch.style.backgroundColor,
      cardStore.getState().sketch.style.opacity
    );
    let darkerRgba = convertHexColorToRgba(
      darkenHexColor(cardStore.getState().sketch.style.backgroundColor, 0.96),
      cardStore.getState().sketch.style.opacity
    );
    let uiRgba = convertHexColorToRgba(cardStore.getState().sketch.style.uiColor);

    if (cardStore.getState().sketch.style.opacity === 0 && this._isEditing) {
      backgroundRgba = 'rgba(255, 255, 255, 1.0)';
      darkerRgba = 'rgba(250, 250, 250, 1.0)';
      uiRgba = 'rgba(204, 204, 204, 1.0)';
    }

    const editor = document.getElementById('editor');
    if (editor) {
      editor.style.borderTopColor = uiRgba;
    }
    // const toolbar = document.getElementById('cke_1_bottom');a
    // if (toolbar) {
    // toolbar.style.backgroundColor = toolbar.style.borderBottomColor = toolbar.style.borderTopColor = uiRgba;
    // }

    const milkdownEditor = document.querySelector('#editor .milkdown') as HTMLElement;
    if (milkdownEditor) {
      milkdownEditor.style.backgroundColor = backgroundRgba;
    }

    /*
    const scrollBarRgba = darkenHexColor(
      cardStore.getState().sketch.style.backgroundColor,
      0.85
    );
    const doc = CKEDITOR.instances.editor.document;
    if (doc) {
      const style = doc.$.createElement('style');
      style.innerHTML =
        'body::-webkit-scrollbar { width: 7px; background-color: ' +
        backgroundRgba +
        '}\n' +
        'body::-webkit-scrollbar-thumb { background-color: ' +
        scrollBarRgba +
        '}';
      doc.getHead().$.appendChild(style);
    }
    */
  };

  execAfterMouseDown = (func: () => Promise<void>) => {
    // CKEDITOR.instances.editor.document.once('mousedown', e => func());
  };
}
