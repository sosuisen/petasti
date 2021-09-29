/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import {
  commandsCtx,
  createCtx,
  defaultValueCtx,
  Editor,
  editorViewCtx,
  MilkdownPlugin,
  rootCtx,
  schemaCtx,
  serializerCtx,
} from '@sosuisen/milkdown-core';
import { prism } from '@sosuisen/milkdown-plugin-prism';
import { listener, listenerCtx } from '@sosuisen/milkdown-plugin-listener';
import { nord } from '@sosuisen/milkdown-theme-nord';
import {
  blockquote,
  bulletList,
  codeFence,
  doc,
  gfm,
  hardbreak,
  heading,
  hr,
  image,
  listItem,
  orderedList,
  paragraph,
  SupportedKeys,
  taskListItem,
  text,
  WrapInBulletList,
} from '@sosuisen/milkdown-preset-gfm';
import { tooltip } from '@sosuisen/milkdown-plugin-tooltip';
import { slash } from '@sosuisen/milkdown-plugin-slash';
import { history } from '@sosuisen/milkdown-plugin-history';
import { i18n, i18nCtx } from '@sosuisen/milkdown-plugin-i18n';
import { emoji } from '@sosuisen/milkdown-plugin-emoji';
import { Node as ProseNode } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { CardCssStyle, ICardEditor } from '../modules_common/types_cardeditor';
import { render, shadowHeight, shadowWidth } from './card_renderer';
import { convertHexColorToRgba, darkenHexColor } from '../modules_common/color';
import { cardStore } from './card_store';
import { cardBodyUpdateCreator } from './card_action_creator';
import { getConfig } from './config';

const marginTop = 3;
const marginLeft = 7;
const scrollBarWidth = 7;
const padding = 2;

export class CardEditorMarkdown implements ICardEditor {
  /**
   * Private
   */
  private _cardCssStyle!: CardCssStyle; // cardCssStyle is set by loadUI()

  /**
   * Public
   */
  public hasCodeMode = false;
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

  calcNodePosition (
    context: ProseNode,
    node: ProseNode
  ): null | { from: number; to: number } {
    let offset = 0;
    /*
    console.log(
      `# getNodeEndpoint, context[${context.type.name}(${context.textContent})], node[${node.type.name}(${node.textContent})]`
    );
    */
    if (context === node) {
      /*
      console.log(
        `  -(match)-> ${JSON.stringify({ from: offset, to: offset + node.nodeSize })}`
      );
      */
      return { from: offset, to: offset + node.nodeSize };
    }

    if (node.isBlock) {
      /*
      console.log(
        `context[${context.type.name}(${context.textContent})] size ${context.content.childCount}`
      );
      */

      for (let i = 0; i < context.content.childCount; i++) {
        // console.log(`context[${context.type.name}(${context.textContent})] index ${i}`);

        const result = this.calcNodePosition(context.content.child(i), node);
        if (result) {
          /*
          console.log(
            `  -> ${JSON.stringify({
              // from: result.from + offset + (context.type.kind === null ? 0 : 1),
              // to: result.to + offset + (context.type.kind === null ? 0 : 1),
              from: result.from + offset + 1, // Add opening tag of context. Its length is one.
              to: result.to + offset + 1, // Add opening tag of context. Its length is one.
            })}`
          );
          */
          return {
            // from: result.from + offset + (context.type.kind === null ? 0 : 1),
            // to: result.to + offset + (context.type.kind === null ? 0 : 1),
            from: result.from + offset + 1,
            to: result.to + offset + 1,
          };
        }
        offset += context.content.child(i).nodeSize;
      }
      return null;
    }
    return null;
  }

  findText = (rootDoc: ProseNode, proseNode: ProseNode, txt: string) => {
    let result: TextSelection[] = [];

    // console.log(`### findText ${proseNode.type.name}(${proseNode.textContent})`);

    if (proseNode.isTextblock) {
      let index = 0;
      let foundAt;
      const ep = this.calcNodePosition(rootDoc, proseNode);

      while ((foundAt = proseNode.textContent.slice(index).search(new RegExp(txt))) > -1) {
        const sel = new TextSelection(
          rootDoc.resolve(ep!.from + index + foundAt),
          rootDoc.resolve(ep!.from + index + foundAt + txt.length)
        );
        // console.log(`Selection: ${sel.from}, ${sel.to}`);
        result.push(sel);
        index = index + foundAt + txt.length;
      }
    }
    else {
      proseNode.content.forEach(
        (child, i) => (result = result.concat(this.findText(rootDoc, child, txt)))
      );
    }
    return result;
  };

  findExtraNBSP = (rootDoc: ProseNode, proseNode: ProseNode) => {
    let result: TextSelection[] = [];

    // console.log(`### findExtraNBSP ${proseNode.type.name}(${proseNode.textContent})`);

    if (proseNode.isTextblock) {
      const index = 0;
      let foundAt;
      const ep = this.calcNodePosition(rootDoc, proseNode);

      if (proseNode.type.name === 'paragraph' && proseNode.textContent === '\u00a0') {
        const sel = new TextSelection(
          rootDoc.resolve(ep!.from),
          rootDoc.resolve(ep!.from + 1)
        );
        // console.log(`Selection: ${sel.from}, ${sel.to}`);
        result.push(sel);
      }
    }
    else {
      proseNode.content.forEach(
        (child, i) => (result = result.concat(this.findExtraNBSP(rootDoc, child)))
      );
    }
    return result;
  };

  loadUI = async (_cardCssStyle: CardCssStyle): Promise<void> => {
    this._cardCssStyle = _cardCssStyle;
    return await Promise.resolve();
  };

  public setData = async (body: string): Promise<void> => {
    // console.log('# load body: ' + body);

    const mdListener = {
      markdown: [
        (getMarkdown: () => string) => {
          console.log(getMarkdown());
        },
      ], // print Markdown
      doc: [
        (proseNode: any) => {
          console.log(proseNode.toString());
        },
      ], // print Node of ProseMirror
    };

    document
      .getElementById('editor')!
      .addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.code === 'Tab') {
          this._editor.action(ctx => {
            const editorView = ctx.get(editorViewCtx);
            const ref = editorView.state.selection;
            const $from = ref.$from;
            const $to = ref.$to;
            const range = $from.blockRange($to);
            // console.log('# parent: ' + range?.parent.type.name);
            if (range?.parent.type.name === 'doc') {
              const commandManager = ctx.get(commandsCtx);
              commandManager.call(WrapInBulletList); // turn to BulletList
              event.preventDefault();
            }
          });
        }
        else if (event.code === 'Backspace') {
          this._editor.action(ctx => {
            const editorView = ctx.get(editorViewCtx);
            const ref = editorView.state.selection;
            const $from = ref.$from;
            const $to = ref.$to;
            const range = $from.blockRange($to);

            if (
              $from.pos === 1 &&
              $to.pos === 1 &&
              range?.parent.type.name === 'doc' &&
              ref.$head.parent.type.name === 'fence'
            ) {
              const schema = ctx.get(schemaCtx);
              const newState = editorView.state.apply(
                editorView.state.tr.setNodeMarkup($from.pos - 1, schema.nodes.paragraph)
              );
              editorView.updateState(newState);
              event.preventDefault();
            }
          });
        }
      });

    /**
     * Reset each mark to be headless.
     * https://github.com/Saul-Mirone/milkdown/discussions/107
     */
    gfm
      .configure(blockquote, { headless: true })
      .configure(bulletList, {
        headless: true,
      })
      .configure(codeFence, { headless: true })
      .configure(doc, { headless: true })
      .configure(hardbreak, {
        headless: true,
        keymap: {
          [SupportedKeys.HardBreak]: ['Shift-Enter'],
        },
      })
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
      .configure(text, { headless: true })
      .configure(taskListItem, {
        headless: true,
        keymap: {
          [SupportedKeys.TaskList]: ['Mod-Enter'],
        },
      });

    /**
     * i18n
     */
    const messages: Record<string, string> = getConfig().messages;
    messages.Meta = getConfig().os === 'darwin' ? 'Cmd' : 'Ctrl';

    /**
     * Create editor
     */
    this._editor = await Editor.make()
      .config(ctx => {
        ctx.set(rootCtx, document.querySelector('#editor'));
        ctx.set(listenerCtx, mdListener);
        ctx.set(defaultValueCtx, body);
        ctx.set(i18nCtx, messages);
      })
      .use(i18n)
      .use(nord)
      .use(gfm)
      .use(history)
      .use(listener)
      .use(prism)
      .use(emoji.headless())
      .use(tooltip)
      //      .use(slash)
      .create();

    /**
     * Replace paragraph(&nbsp) with paragraph
     */
    this._editor.action(ctx => {
      const editorView = ctx.get(editorViewCtx);
      // const selections = this.findText(editorView.state.doc, editorView.state.doc, '\u00a0'); // Find &nbsp;
      const selections = this.findExtraNBSP(editorView.state.doc, editorView.state.doc); // Find <p>&nbsp;</p>
      // console.log('# Search result: ' + JSON.stringify(selections));
      let selection: TextSelection | undefined;
      let offset = 0;
      while ((selection = selections.shift())) {
        const from = selection.from + offset;
        const to = selection.to + offset;
        const newState = editorView.state.apply(
          editorView.state.tr.deleteRange(from, to)
          // editorView.state.tr.insertText('x', selection.from, selection.to)
        );
        // console.log(`# transformed: (${from}, ${to}) ` + newState.doc.toString());
        editorView.updateState(newState);

        // delete a character
        offset--;
      }
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

    let data = this._editor.action(ctx => {
      const editorView = ctx.get(editorViewCtx);
      const serializer = ctx.get(serializerCtx);
      return serializer(editorView.state.doc); // editorView.state.doc is ProseNode
    });

    /**
     * Replace empty new lines in the editor area with &nbsp; to keep new lines in markdown.
     */
    data = data.replace(/\n\n(\n\n+?)([^\n])/g, (match, p1, p2) => {
      let result = '\n';
      for (let i = 0; i < p1.length / 2; i++) {
        result += '\n&nbsp;\n';
      }
      return result + '\n' + p2;
    });
    data = data.replace(/^\n/, '&nbsp;\n\n');

    /**
     * \n in code-fence was escaped by replacing with \r to avoid to be replaced with &nbsp;
     * So replace \r with \n to revert it.
     */

    data = data.replace(/\r/g, '\n');

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
      this.setSize();
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
      const innerWidth =
        width / cardStore.getState().sketch.style.zoom -
        marginLeft * 2 -
        padding * 2 -
        scrollBarWidth * cardStore.getState().sketch.style.zoom;
      const innerHeight =
        height / cardStore.getState().sketch.style.zoom - marginTop * 2 - padding * 2;

      innerEditor.style.width = innerWidth + 'px';
      innerEditor.style.height = innerHeight + 'px';
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
      '.milkdown::-webkit-scrollbar { width: ' +
      scrollBarWidth +
      'px; background-color: ' +
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
