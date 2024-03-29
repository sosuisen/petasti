/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */

import {
  commandsCtx,
  Editor,
  editorViewCtx,
  parserCtx,
  prosePluginFactory,
  rootCtx,
  schemaCtx,
  serializerCtx,
} from '@sosuisen/milkdown-core';
import { prism } from '@sosuisen/milkdown-plugin-prism';
import { listener, listenerCtx } from '@sosuisen/milkdown-plugin-listener';
import { clipboard } from '@sosuisen/milkdown-plugin-clipboard';
import { nord } from '@sosuisen/milkdown-theme-nord';
import {
  blockquote,
  bulletList,
  codeFence,
  codeInline,
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
import { Fragment, Node as ProseNode, Slice } from 'prosemirror-model';
import { EditorState, Plugin as ProsePlugin, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { CardCssStyle, ICardEditor } from '../modules_common/types_cardeditor';
import { render, shadowHeight, shadowWidth } from './card_renderer';
import { convertHexColorToRgba, strengthenHexColor } from '../modules_common/color';
import { cardStore } from './card_store';
import {
  cardBodyUpdateCreator,
  cardCollapsedListUpdateCreator,
  cardLabelUpdateCreator,
} from './card_action_creator';
import { getConfig } from './config';
import window from './window';
import { getCtrlDown, getMetaDown } from '../modules_common/keys';
import { CARD_MARGIN_LEFT, CARD_MARGIN_TOP, CARD_PADDING } from '../modules_common/const';

export class CardEditorMarkdown implements ICardEditor {
  /**
   * Private
   */
  private _cardCssStyle!: CardCssStyle; // cardCssStyle is set by loadUI()

  /**
   * Public
   */
  public skipSave = true; // Skip save at the first time and when updated by remote

  public hasCodeMode = false;
  public isCodeMode = false;

  public isOpened = false;

  private _isEditing = false;

  private _editor!: Editor;

  private _previousDoc: {
    [key: string]: any;
  } = {};

  private _created = false;

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
        (child, i) => (result = [...result, ...this.findText(rootDoc, child, txt)])
      );
    }
    return result;
  };

  findExtraTag = (rootDoc: ProseNode, proseNode: ProseNode) => {
    let result: {
      type: 'nbsp' | 'summary';
      selection: TextSelection;
    }[] = [];

    // console.log(`### findExtraTag ${proseNode.type.name}(${proseNode.textContent})`);

    if (proseNode.isTextblock) {
      const index = 0;
      let foundAt;
      const ep = this.calcNodePosition(rootDoc, proseNode);

      if (proseNode.type.name === 'paragraph') {
        if (proseNode.textContent === '\u00a0') {
          const selection = new TextSelection(
            rootDoc.resolve(ep!.from),
            rootDoc.resolve(ep!.from + 1)
          );
          // console.log(`Selection: ${sel.from}, ${sel.to}`);
          result.push({ type: 'nbsp', selection });
        }
        /*
        else if (proseNode.textContent === '{.summary}') {
          const selection = new TextSelection(
            rootDoc.resolve(ep!.from),
            rootDoc.resolve(ep!.from + 10)
          );
          // console.log(`Selection: ${sel.from}, ${sel.to}`);
          result.push({ type: 'summary', selection });
        }
        */
      }
    }
    else {
      proseNode.content.forEach((child, i) => {
        result = [...result, ...this.findExtraTag(rootDoc, child)];
      });
    }
    return result;
  };

  loadUI = async (_cardCssStyle: CardCssStyle): Promise<void> => {
    this._cardCssStyle = _cardCssStyle;

    document
      .getElementById('editor')!
      .addEventListener('keydown', (event: KeyboardEvent) => {
        if (this._editor === undefined) return;
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
        else if (
          ((getConfig().os !== 'darwin' && getCtrlDown()) ||
            (getConfig().os === 'darwin' && getMetaDown())) &&
          (event.code === 'ArrowUp' || event.code === 'ArrowDown')
        ) {
          const isCollapse = event.code === 'ArrowUp';
          this._editor.action(ctx => {
            const editorView = ctx.get(editorViewCtx);

            const ref = editorView.state.selection;
            const $from = ref.$from;
            const $to = ref.$to;
            const range = $from.blockRange($to);

            let isChanged = false;
            if (
              range?.parent?.type.name === 'list_item' ||
              range?.parent?.type.name === 'task_list_item'
            ) {
              // console.log(editorView.state.doc.toString());
              const start = $from.before($from.depth - 1); // start position of parent

              range?.parent.forEach((child, offsetFromParent, index) => {
                if (
                  child.type.name === 'bullet_list' ||
                  child.type.name === 'ordered_list'
                ) {
                  isChanged = true;
                  // console.log(
                  //  'children index: ' + start + ' + ' + offsetFromParent + ' + 1'
                  // );

                  const newState = editorView.state.apply(
                    editorView.state.tr.setNodeMarkup(
                      start + offsetFromParent + 1,
                      undefined,
                      {
                        collapsed: isCollapse,
                      }
                    )
                  );
                  editorView.updateState(newState);
                }
              });

              if (isChanged) {
                let attr;
                if (range?.parent?.type.name === 'list_item') {
                  attr = {
                    collapsed: isCollapse,
                  };
                }
                else if (range?.parent?.type.name === 'task_list_item') {
                  attr = {
                    collapsed: isCollapse,
                    checked: range?.parent.attrs.checked,
                  };
                }

                const newItemState = editorView.state.apply(
                  editorView.state.tr.setNodeMarkup(start, undefined, attr)
                );
                editorView.updateState(newItemState);
              }

              event.preventDefault();
            }
          });
        }
      });

    document.getElementById('editor')!.addEventListener('mouseup', (event: MouseEvent) => {
      this._editor.action(ctx => {
        const view = ctx.get(editorViewCtx);
        if (view.state.selection.empty) {
          const marks = view.state.selection.$head.marks();
          for (const mark of marks) {
            if (mark.type.name === 'link') {
              const url = mark.attrs.href;
              // console.log('# ViewEvent click: ' + url);
              // Click link
              // const linkText =
              //  view.state.selection.$head.nodeBefore!.textContent +
              //  view.state.selection.$head.nodeAfter!.textContent;
              window.api.openURL(url);
              break;
            }
          }
        }
      });
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
      /*
      .configure(hardbreak, {
        headless: true,
        keymap: {
          [SupportedKeys.HardBreak]: ['Shift-Enter'],
        },
      })
      */
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
      .configure(codeInline, { headless: true })
      .configure(orderedList, { headless: true })
      .configure(paragraph, { headless: true })
      .configure(text, { headless: true })
      .configure(taskListItem, {
        headless: true,
        keymap: {
          [SupportedKeys.TaskList]: ['Mod-Enter'],
          [SupportedKeys.SinkListItem]: ['Tab', 'Alt-Shift-ArrowRight'],
          [SupportedKeys.PopListItem]: ['Shift-Tab', 'Alt-Shift-ArrowLeft'],
        },
      });

    return await Promise.resolve();
  };

  public createEditor = async (): Promise<void> => {
    this._created = true;
    /**
     * i18n
     */
    const messages: Record<string, string> = getConfig().messages;
    messages.Meta = getConfig().os === 'darwin' ? 'Cmd' : 'Ctrl';

    const mdListener = {
      markdown: [
        (getMarkdown: () => string) => {
          console.log(getMarkdown());
        },
      ], // print Markdown
      doc: [
        (proseNode: any) => {
          console.log(proseNode.toString());
          if (this.skipSave) {
            this.skipSave = false;
          }
          else {
            this._saveBody(proseNode);
          }
        },
      ], // print Node of ProseMirror
    };

    /**
     * View event plugin
     * update is invoked when view is changed by key and mouse
     */
    const viewEventPlugin = new ProsePlugin({
      // @ts-ignore
      view (editorView) {
        return {
          update: (view: EditorView, prevState: EditorState) => {
            const selection = view.state.selection;
            let hasSelection: boolean;
            if (selection.$from.pos === selection.$to.pos) hasSelection = false;
            else hasSelection = true;
            window.api.responseOfHasSelection(
              cardStore.getState().workState.url,
              hasSelection
            );

            /*
            const editor = document.getElementById('editor');
            if (editor !== null) {
              editor.scrollLeft = 0;
              if (editor.scrollTop < 0) {
                editor.scrollTop = 0;
              }
            }
            const contents = document.getElementById('contents');
            if (contents !== null) {
              contents.scrollLeft = 0;
              if (contents.scrollTop < 0) {
                contents.scrollTop = 0;
              }
            }
            */
            /*
            const marks = view.state.selection.$head.marks();
            const markNames = marks.map(mark => mark.type.name);
            if (view.state.selection.empty && markNames.includes('link')) {

            console.log(
              '# View event all text in the same paragraph: ' +
                view.state.selection.$head.node().textContent
            );
            console.log(
              '# View event nodeAfter.type: ' +
                view.state.selection.$head.nodeAfter!.type.name
            );
            console.log(
              '# View event node selected text: ' +
                view.state.selection.$head.nodeBefore!.textContent +
                view.state.selection.$head.nodeAfter!.textContent
            );

              // Click link
              const url =
                view.state.selection.$head.nodeBefore!.textContent +
                view.state.selection.$head.nodeAfter!.textContent;
              // console.log('# ViewEvent click: ' + url);
              window.api.openURL(url);
            }
          */
          },
          destroy: () => {},
        };
      },
    });

    const prosePlugin = prosePluginFactory(viewEventPlugin);
    /**
     * Create editor
     */
    this._editor = await Editor.make()
      .config(ctx => {
        ctx.set(rootCtx, document.querySelector('#editor'));
        ctx.set(listenerCtx, mdListener);
        // ctx.set(defaultValueCtx, body);
        ctx.set(i18nCtx, messages);
      })
      .use(clipboard)
      .use(prosePlugin)
      .use(i18n)
      .use(nord)
      .use(gfm)
      .use(history)
      .use(listener)
      .use(prism)
      //      .use(emoji.headless())
      .use(tooltip)
      //      .use(slash)
      .create();

    const innerEditor = document.querySelector('#editor .milkdown .editor') as HTMLElement;
    innerEditor.addEventListener('paste', async event => {
      if (event.clipboardData?.types.includes('text/html')) {
        return;
      }
      const pasteData = event.clipboardData?.getData('text') as string;
      if (pasteData.match(/.+:\/\/.+/)) {
        // Reload markdown to parse when pasteData has schema.
        await this.setData(
          cardStore.getState().body._body,
          cardStore.getState().sketch.collapsedList
        );
      }
    });
  };

  public hasSelection = () => {
    return this._editor.action(ctx => {
      const editorView = ctx.get(editorViewCtx);
      const selection = editorView.state.selection;
      if (selection.$from.pos === selection.$to.pos) return false;
      return true;
    });
  };

  public deleteSelection = () => {
    this._editor.action(ctx => {
      const editorView = ctx.get(editorViewCtx);
      const tr = editorView.state.tr;
      const newState = editorView.state.apply(tr.deleteSelection());
      editorView.updateState(newState);
    });
  };

  public replaceSelection = (markdown: string) => {
    this._editor.action(ctx => {
      const parser = ctx.get(parserCtx);
      const editorView = ctx.get(editorViewCtx);
      let newDoc;
      let newState;
      try {
        newDoc = parser(markdown);
      } catch (err) {}
      if (newDoc != null) {
        const frag = Fragment.from(newDoc);
        newState = editorView.state.apply(
          editorView.state.tr.replaceWith(
            editorView.state.selection.from,
            editorView.state.selection.to,
            frag
          )
        );
      }
      else {
        newState = editorView.state.apply(editorView.state.tr.deleteSelection());
      }
      editorView.updateState(newState);
    });
  };

  public getSelectedMarkdown = (): [string, number, number, number, number] => {
    return this._editor.action(ctx => {
      const serializer = ctx.get(serializerCtx);
      const editorView = ctx.get(editorViewCtx);
      const selection = editorView.state.selection;
      const schema = ctx.get(schemaCtx);
      const selectionDoc = schema.topNodeType.createAndFill(
        undefined,
        selection.content().content
      );
      const fromRect = editorView.coordsAtPos(selection.$from.pos);
      const toRect = editorView.coordsAtPos(selection.$to.pos);

      if (!selectionDoc)
        return ['', fromRect.left, toRect.right, fromRect.top, toRect.bottom];

      const markdown = serializer(selectionDoc);
      return [markdown, fromRect.left, toRect.right, fromRect.top, toRect.bottom];
    });
  };

  public setData = (body: string, collapsedList: number[]): void => {
    console.log('# load body: ' + body);

    /**
     * Replace paragraph(&nbsp) with paragraph
     */
    this._editor.action(ctx => {
      const parser = ctx.get(parserCtx);
      let newDoc;
      try {
        newDoc = parser(body);
      } catch (err) {
        console.log('### parse fallback');
        // Add list item mark if heading indent does not end with an item mark.
        body = body.replace(/^(\s+)([^\d\s*-])/gm, '$1* $2');
        console.log(body);
        try {
          newDoc = parser(body);
        } catch (err2) {
          // TODO: show error message card
          console.log(err2);
          return;
        }
      }

      if (newDoc === undefined || newDoc === null) return;
      // console.log('newDoc: ' + newDoc!.toString());

      const editorView = ctx.get(editorViewCtx);

      const tr = editorView.state.tr.replace(
        0,
        editorView.state.doc.content.size,
        new Slice(Fragment.from(newDoc), 0, 0)
      );

      /*
      const newState = editorView.state.apply(tr);
      editorView.updateState(newState);
      */

      // console.log(`# delete existing tree: ` + newState.doc.toString());

      // const selections = this.findText(editorView.state.doc, editorView.state.doc, '\u00a0'); // Find &nbsp;
      const results = this.findExtraTag(newDoc, newDoc); // Find <p>&nbsp;</p>
      // console.log('# Search result: ' + JSON.stringify(selections));
      let result:
        | {
            type: 'nbsp' | 'summary';
            selection: TextSelection;
          }
        | undefined;
      let offset = 0;
      while ((result = results.shift())) {
        const from = result.selection.from + offset;
        const to = result.selection.to + offset;
        if (result.type === 'nbsp') {
          tr.deleteRange(from, to);
          offset--;
        }
      }
      if (collapsedList.length > 0) {
        tr.doc.descendants((node: ProseNode, pos: number) => {
          if (collapsedList.includes(pos)) {
            console.log('# collapsed: ' + pos);
            let attr;
            if (node!.type.name === 'list_item') {
              attr = {
                collapsed: true,
              };
            }
            else if (node!.type.name === 'task_list_item') {
              attr = {
                collapsed: true,
                checked: node.attrs.checked,
              };
            }
            else {
              console.log('Error in setting collapsed list: invalid node type.');
              return true;
            }
            tr.setNodeMarkup(pos, undefined, attr);
            node.forEach((child, offsetFromParent, index) => {
              if (child.type.name === 'bullet_list' || child.type.name === 'ordered_list') {
                // console.log('children index: ' + start + ' + ' + offsetFromParent + ' + 1');
                tr.setNodeMarkup(pos + offsetFromParent + 1, undefined, {
                  collapsed: true,
                });
              }
            });
          }
          return true;
        });
      }
      const newState = editorView.state.apply(tr);
      editorView.updateState(newState);
    });
  };

  private _addDragAndDropEvent = () => {};

  showEditor = async (): Promise<void> => {
    if (!this._created) {
      await this.createEditor();
      await this.setData(
        cardStore.getState().body._body,
        cardStore.getState().sketch.collapsedList
      );
    }
    if (this.isOpened) {
      return;
    }

    const editor = document.getElementById('editor');
    if (editor) {
      editor.style.visibility = 'visible';
    }
    else {
      throw new Error('editor does not exist.');
    }

    const contents = document.getElementById('contents');
    if (contents) {
      contents.style.visibility = 'hidden';
    }

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

    this._previousDoc = this._editor.action(ctx => {
      const editorView = ctx.get(editorViewCtx);
      return editorView.state.doc.toJSON();
    });

    render(['EditorStyle']);
    const innerEditor = document.querySelector('#editor .milkdown .editor') as HTMLElement;
    innerEditor.focus();
  };

  private _saveBody = async (proseNode?: ProseNode) => {
    let currentDoc: { [key: string]: any };
    let rootNode!: ProseNode;
    if (proseNode !== undefined) {
      rootNode = proseNode;
      currentDoc = proseNode.toJSON();
    }
    else {
      currentDoc = this._editor.action(ctx => {
        const editorView = ctx.get(editorViewCtx);
        rootNode = editorView.state.doc;
        return editorView.state.doc.toJSON();
      });
      if (JSON.stringify(currentDoc) === JSON.stringify(this._previousDoc)) {
        return;
      }
    }
    this._previousDoc = currentDoc;

    const collapsedList: number[] = [];
    rootNode.descendants((node: ProseNode, pos: number) => {
      if (
        (node!.type.name === 'list_item' || node!.type.name === 'task_list_item') &&
        node!.attrs.collapsed
      ) {
        collapsedList.push(pos);
        //        console.log(node.type.name + '[collapsed]: ' + pos);
      }
      else {
        // console.log(node.type.name + ': ' + pos);
      }
      return true;
    });

    let data = this._editor.action(ctx => {
      const serializer = ctx.get(serializerCtx);
      return serializer(rootNode);
    });

    console.log(data);

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
    // heading \n
    data = data.replace(/^\n/, '&nbsp;\n\n');
    // trailing \n
    data = data.replace(/(\n\n+?)$/g, (match, p1) => {
      let result = '\n';
      for (let i = 0; i < p1.length / 2; i++) {
        result += '\n&nbsp;\n';
      }
      return result;
    });

    /**
     * \n in code-fence was escaped by replacing with \r to avoid to be replaced with &nbsp;
     * So replace \r with \n to revert it.
     */

    data = data.replace(/\r/g, '\n');

    /**
     * Heading spaces must be replaced by &nbsp; except code-fence.
     * NOTE: Exclude following hyphen - not to replace spaces before list item
     */
    data = data.replace(/^( {0,3})[^ *+-]/gm, (match, p1, p2) => {
      return match.replace(/ /g, '&nbsp;');
    });
    await cardStore.dispatch(cardBodyUpdateCreator(data));
    await cardStore.dispatch(cardCollapsedListUpdateCreator(collapsedList));
  };

  endEdit = async (): Promise<void> => {
    this._isEditing = false;

    // clearInterval(this._saveInterval!);

    await this._saveBody();

    // Reset editor color to card color
    render(['TitleBar', 'EditorStyle']);

    // Update label
    const newLabel = {
      ...cardStore.getState().sketch.label,
      text: this.getLabelText(),
    };
    await cardStore.dispatch(cardLabelUpdateCreator(newLabel));
  };

  getHTML = async (): Promise<string> => {
    if (!this._created) {
      await this.createEditor();
      await this.setData(
        cardStore.getState().body._body,
        cardStore.getState().sketch.collapsedList
      );
    }

    const dom = this._editor.action(ctx => {
      const editorView = ctx.get(editorViewCtx);
      // const dom = editorView.nodeDOM(0);
      return editorView.dom;
    });
    console.log('# innerHTML: ' + dom.innerHTML);

    return dom.innerHTML;
  };

  getLabelText = (): string => {
    const dom = this._editor.action(ctx => {
      const editorView = ctx.get(editorViewCtx);
      // const dom = editorView.nodeDOM(0);
      return editorView.dom;
    });
    const html = dom.innerHTML;
    const paragraphs = html.split('</p>');
    let labelText = '';
    if (paragraphs.length > 0) labelText = paragraphs[0] + '</p>';

    return labelText;
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
    const editor = document.getElementById('editor') as HTMLElement;
    const left = editor.scrollLeft;
    const top = editor.scrollTop;
    return { left, top };
  };

  setScrollPosition = (left: number, top: number) => {
    console.log('# setScrollPosition top: ' + top);
    const editor = document.getElementById('editor') as HTMLElement;
    editor.scrollLeft = left;
    editor.scrollTop = top;
  };

  setZoom = () => {
    const innerEditor = document.querySelector('#editor .milkdown .editor') as HTMLElement;
    if (innerEditor) {
      innerEditor.style.transformOrigin = 'top left';
      innerEditor.style.transform = `scale(${cardStore.getState().sketch.style.zoom})`;

      this.setSize();
    }
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
    const innerEditor = document.querySelector('#editor .milkdown .editor') as HTMLElement;
    if (milkdownEditor && innerEditor) {
      milkdownEditor.style.width = width - CARD_MARGIN_LEFT * 2 - CARD_PADDING * 2 + 'px';
      milkdownEditor.style.height = height - CARD_MARGIN_TOP * 2 - CARD_PADDING * 2 + 'px';

      const innerWidth =
        width / cardStore.getState().sketch.style.zoom -
        CARD_MARGIN_LEFT * 2 -
        CARD_PADDING * 2;
      const innerHeight =
        height / cardStore.getState().sketch.style.zoom -
        CARD_MARGIN_TOP * 2 -
        CARD_PADDING * 2;

      innerEditor.style.width = innerWidth + 'px';
      innerEditor.style.height = innerHeight + 'px';
    }
  };

  setColor = (): void => {
    let backgroundRgba = convertHexColorToRgba(
      cardStore.getState().sketch.style.backgroundColor,
      cardStore.getState().sketch.style.opacity
    );
    let uiRgba = convertHexColorToRgba(cardStore.getState().sketch.style.uiColor);

    if (cardStore.getState().sketch.style.opacity === 0 && this._isEditing) {
      backgroundRgba = 'rgba(255, 255, 255, 1.0)';
      uiRgba = 'rgba(204, 204, 204, 1.0)';
    }

    const editor = document.getElementById('editor');
    if (editor) {
      editor.style.borderTopColor = uiRgba;
      editor.style.backgroundColor = backgroundRgba;
    }

    const scrollBarRgba = convertHexColorToRgba(
      strengthenHexColor(cardStore.getState().sketch.style.backgroundColor, 0.9),
      0.4
    );
    const style = window.document.createElement('style');
    style.innerHTML =
      '#editor::-webkit-scrollbar { background-color: ' +
      backgroundRgba +
      '}\n' +
      '#editor::-webkit-scrollbar-thumb { background-color: ' +
      scrollBarRgba +
      '}';
    window.document.head.appendChild(style);
  };
}
