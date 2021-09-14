/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import {
  AnyRecord,
  Editor,
  editorViewCtx,
  parserCtx,
  rootCtx,
  serializerCtx,
} from '@milkdown/core';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { nord } from '@milkdown/theme-nord';
import {
  blockquote,
  bulletList,
  codeFence,
  commonmark,
  commonmarkNodes,
  commonmarkPlugins,
  doc,
  hardbreak,
  heading,
  hr,
  image,
  listItem,
  orderedList,
  paragraph,
  SupportedKeys,
  text,
} from '@milkdown/preset-commonmark';
import { history } from '@milkdown/plugin-history';
import { emoji } from '@milkdown/plugin-emoji';
import { CardCssStyle, ICardEditor } from '../modules_common/types_cardeditor';
import { render, shadowHeight, shadowWidth } from './card_renderer';
import { convertHexColorToRgba, darkenHexColor } from '../modules_common/color';
import { cardStore } from './card_store';
import { cardBodyUpdateCreator } from './card_action_creator';

const marginTop = 3;
const marginLeft = 7;
const padding = 2;
export class CardEditorMarkdown implements ICardEditor {
  /**
   * Private
   */
  private _cardCssStyle!: CardCssStyle; // cardCssStyle is set by loadUI()

  /**
   * Public
   */
  public hasCodeMode = true;
  public isCodeMode = false;

  public isOpened = false;

  private _isEditing = false;

  private _editor!: Editor;
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

    // Reset each mark to be headless.
    // https://github.com/Saul-Mirone/milkdown/discussions/107
    const commonmarks = commonmarkNodes
      .configure(blockquote, { headless: true })
      .configure(bulletList, {
        headless: true,
        keymap: {
          [SupportedKeys.BulletList]: 'Tab',
        },
      })
      .configure(codeFence, { headless: true })
      .configure(doc, { headless: true })
      .configure(hardbreak, { headless: true })
      .configure(heading, { headless: true })
      .configure(hr, { headless: true })
      .configure(image, { headless: true })
      .configure(listItem, {
        headless: true,
        keymap: {
          [SupportedKeys.SinkListItem]: ['Tab', 'Alt-Shift-ArrowRight'],
          [SupportedKeys.PopListItem]: ['Shift-Tab', 'Alt-Shift-ArrowLeft'],
        },
      })
      .configure(orderedList, { headless: true })
      .configure(paragraph, { headless: true })
      .configure(text, { headless: true });

    this._editor = await Editor.make()
      .config(ctx => {
        ctx.set(rootCtx, document.querySelector('#editor'));
        ctx.set(listenerCtx, mdListener);
      })
      .use(nord)
      .use(commonmark)
      .use(commonmarkNodes)
      .use(history)
      .use(listener)
      .use(emoji.headless())
      .use(commonmarkPlugins)
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

  public setData = (body: string): void => {
    this._editor.action(ctx => {
      const editorView = ctx.get(editorViewCtx);
      const parser = ctx.get(parserCtx);
      console.log('setData: ' + body);
      const md = parser(body);
      if (!md) return;
      const tr = editorView.state.tr;
      // setData replaces existing text
      const newState = editorView.state.apply(
        // tr.insertText(md, 0, editorView.state.doc.content.size)
        tr.replaceSelectionWith(md)
      );
      editorView.updateState(newState);
    });
  };

  private _addDragAndDropEvent = () => {};

  showEditor = (): void => {
    if (this.isOpened) {
      return;
    }

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
  };

  hideEditor = () => {
    this.isOpened = false;
    document.getElementById('contents')!.style.visibility = 'visible';
    document.getElementById('editor')!.style.visibility = 'hidden';
  };

  startEdit = () => {
    this._isEditing = true;
    render(['EditorStyle']);

    return Promise.resolve();
  };

  endEdit = async (): Promise<string> => {
    this._isEditing = false;

    // Save data to AvatarProp

    const data = this._editor.action(ctx => {
      const editorView = ctx.get(editorViewCtx);
      const serializer = ctx.get(serializerCtx);
      return serializer(editorView.state.doc); // editorView.state.doc is ProseNode
    });

    await cardStore.dispatch(cardBodyUpdateCreator(data));

    // Reset editor color to card color
    render(['TitleBar', 'EditorStyle']);

    // eslint-disable-next-line no-unused-expressions
    // CKEDITOR.instances.editor.getSelection()?.removeAllRanges();

    return Promise.resolve(data);
  };

  getHTML = (): string => {
    const dom = this._editor.action(ctx => {
      const editorView = ctx.get(editorViewCtx);
      // const dom = editorView.nodeDOM(0);
      return editorView.dom;
    });
    console.log('# innerHTML: ' + dom.innerHTML);
    return dom.innerHTML;
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

    // In code mode, editor background color is changed to white.
  };

  endCodeMode = () => {
    this.isCodeMode = false;

    /*
     * Reset editor color to card color
     * and reset width and height of cke_wysiwyg_frame
     */
    render(['TitleBar', 'TitleBarStyle', 'EditorStyle', 'EditorRect']);
  };

  getScrollPosition = () => {
    const milkdownEditor = document.querySelector('#editor .milkdown') as HTMLElement;
    const left = milkdownEditor.scrollLeft * cardStore.getState().sketch.style.zoom;
    const top = milkdownEditor.scrollTop * cardStore.getState().sketch.style.zoom;
    return { left, top };
  };

  setScrollPosition = (left: number, top: number) => {
    const milkdownEditor = document.querySelector('#editor .milkdown') as HTMLElement;
    milkdownEditor.scrollLeft = left;
    milkdownEditor.scrollTop = top;
  };

  setZoom = () => {
    const milkdownEditor = document.querySelector('#editor .milkdown') as HTMLElement;
    if (milkdownEditor) {
      // @ts-ignore
      milkdownEditor.style.zoom = `${cardStore.getState().sketch.style.zoom}`;
    }
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

    const innerEditor = document.querySelector('#editor .milkdown .editor') as HTMLElement;
    if (innerEditor) {
      innerEditor.style.width = width - marginLeft - padding * 2 + 'px';
      innerEditor.style.height = height - marginTop * 2 - padding * 2 + 'px';
    }
    /*
    const milkdownEditor = document.querySelector('#editor .milkdown') as HTMLElement;
    if (milkdownEditor) {
      milkdownEditor.style.width = width + 'px';
      milkdownEditor.style.height = height + 'px';
    }
    */
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

    const scrollBarRgba = darkenHexColor(
      cardStore.getState().sketch.style.backgroundColor,
      0.85
    );
    const style = window.document.createElement('style');
    style.innerHTML =
      '.milkdown::-webkit-scrollbar { width: 7px; background-color: ' +
      backgroundRgba +
      '}\n' +
      '.milkdown::-webkit-scrollbar-thumb { background-color: ' +
      scrollBarRgba +
      '}';
    window.document.head.appendChild(style);
  };

  execAfterMouseDown = (func: () => Promise<void>) => {
    // CKEDITOR.instances.editor.document.once('mousedown', e => func());
  };
}
