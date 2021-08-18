/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { CardPropStatus } from '../modules_common/types';
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
import { saveCard, saveCardColor } from './save';
import window from './window';

export class CardEditor implements ICardEditor {
  /**
   * Private
   */
  private _errorFailedToSetData = 'Failed to set data.';

  private _toolBarHeight = 28;

  private _startEditorFirstTime = true;

  private _cardPropStatus!: CardPropStatus;

  private _cardCssStyle!: CardCssStyle; // cardCssStyle is set by loadUI()

  /**
   * Public
   */
  public hasCodeMode = true;
  public isCodeMode = false;

  public isOpened = false;

  private _isEditing = false;

  /**
   * queueSaveCommand
   * Queuing and execute only last save command to avoid frequent save.
   */
  execSaveCommandTimeout = 0;
  execSaveCommand = () => {
    saveCard(this._cardPropStatus);
  };

  queueSaveCommand = () => {
    clearTimeout(this.execSaveCommandTimeout);
    this.execSaveCommandTimeout = window.setTimeout(this.execSaveCommand, 2000);
  };

  getImageTag = (
    id: string,
    src: string,
    width: number,
    height: number,
    alt: string
  ): string => {
    return `<img id="${id}" src="${src}" alt="${alt}" width="${width}" height="${height}" />`;
  };

  adjustEditorSizeFromImage2Plugin = async (imgWidth: number, imgHeight: number) => {
    // Cancel the resizing when the card contains anything other than an image.
    const body = CKEDITOR.instances.editor.document.getBody();
    if (body.$.childNodes.length >= 4) {
      return;
    }
    let count = 0;
    // Skip counting nodes that are appended by plugin
    for (let i = 0; i < body.$.childNodes.length; i++) {
      const node = body.$.childNodes.item(i) as ChildNode;
      if (node.nodeType === Node.ELEMENT_NODE) {
        const elm = node as Element;
        // console.log(i + '[E:' + elm.tagName + ']' + elm.outerHTML);
        if (elm.getAttribute('data-cke-temp')) {
          continue;
        }
        if (elm.tagName.match(/br/i) && i > 0) {
          // Skip <br>, but don't skip the first one.
          continue;
        }
        count++;
      }
      else {
        // console.log(i + '[T]' + node.textContent);
        count++;
      }
      if (count >= 2) {
        return;
      }
    }

    const toolbar = document.getElementById('cke_1_bottom');
    if (toolbar) {
      toolbar.style.visibility = 'hidden';
    }

    const windowWidth =
      imgWidth + DRAG_IMAGE_MARGIN + this._cardCssStyle.borderWidth * 2 + shadowWidth;
    const geometryWidth = windowWidth - getRenderOffsetWidth();
    const windowHeight =
      imgHeight +
      DRAG_IMAGE_MARGIN +
      document.getElementById('title')!.offsetHeight +
      this._cardCssStyle.borderWidth * 2 +
      shadowHeight;
    const geometryHeight = windowHeight - getRenderOffsetHeight();

    if (windowWidth < 200) {
      /**
       * Toolbar has 2 lines when width is less than 200px.
       * Cancel the resizing because the bottom of the image will be obscured by the line.
       */
      return;
    }

    await window.api.setWindowSize(this._cardPropStatus.url, windowWidth, windowHeight);

    this._cardPropStatus.geometry.width = geometryWidth;
    this._cardPropStatus.geometry.height = geometryHeight;

    render(['TitleBar', 'EditorRect']);
  };

  loadUI = (_cardCssStyle: CardCssStyle): Promise<void> => {
    this._cardCssStyle = _cardCssStyle;
    return new Promise<void>(resolve => {
      CKEDITOR.replace('editor');

      // Set default value of link target to _blank
      CKEDITOR.on('dialogDefinition', function (ev) {
        const dialogName = ev.data.name;
        const dialogDefinition = ev.data.definition;
        if (dialogName === 'link') {
          const targetTab = dialogDefinition.getContents('target');
          const targetField = targetTab.get('linkTargetType');
          targetField.default = '_blank';
        }
      });

      CKEDITOR.on('instanceReady', () => {
        // @ts-ignore
        CKEDITOR.plugins.image2.adjustEditorSize = this.adjustEditorSizeFromImage2Plugin;

        CKEDITOR.instances.editor.keystrokeHandler.keystrokes[CKEDITOR.CTRL + 190] =
          'bulletedlist';

        CKEDITOR.instances.editor.on('change', () => {
          const data = CKEDITOR.instances.editor.getData();
          if (this._cardPropStatus._body !== data) {
            this._cardPropStatus._body = data;
            render(['TitleBar']);
            this.queueSaveCommand();
          }
        });

        resolve();
        /*
         * Use timer for checking if instanceReady event is incredible
        const checkTimer = setInterval(() => {
          // Checking existence of 'cke_editor',
          // container, and .cke_inner
          if (
            document.getElementById('cke_editor') &&
            CKEDITOR.instances['editor'].container &&
            document.querySelector('.cke_inner')
          ) {
            clearInterval(checkTimer);
            resolve();
          }
        }, 200);
        */
      });
    });
  };

  setCard = (prop: CardPropStatus): void => {
    this._cardPropStatus = prop;
  };

  waitUntilActivationComplete = (): Promise<void> => {
    return new Promise(resolve => {
      const editor = CKEDITOR.instances.editor;
      const timer = setInterval(() => {
        const s = editor.getSelection();
        if (s) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  };

  private _imeWorkaround = async (): Promise<void> => {
    /**
     * This is workaround for Japanese IME & CKEditor on Windows.
     * IME window is unintentionally opened only at the first time of inputting Japanese.
     * Expected behavior is that IME always work inline on CKEditor.
     * A silly workaround is to blur and focus this browser window.
     */
    await window.api.blurAndFocusWithSuppressEvents(this._cardPropStatus.url);
  };

  private _setData = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        CKEDITOR.instances.editor.setData(this._cardPropStatus._body, {
          callback: () => {
            // setData may be fail. Watch out.
            resolve();
          },
        });
      } catch (e) {
        reject(new Error(this._errorFailedToSetData));
      }
    });
  };

  private _addDragAndDropEvent = () => {
    // Don't use drop event : CKEDITOR.instances['editor'].on('drop', async evt => {});
    // Paste event is automatically occurred after drop.
    CKEDITOR.instances.editor.on('paste', async evt => {
      const id: string = await window.api.getUuid();
      const dataTransfer = evt.data.dataTransfer;
      if (dataTransfer.$.files) {
        const file = dataTransfer.$.files[0];
        if (file) {
          const dropImg = new Image();
          // eslint-disable-next-line unicorn/prefer-add-event-listener
          dropImg.onload = () => {
            const width = dropImg.naturalWidth;
            const height = dropImg.naturalHeight;

            let newImageWidth =
              this._cardPropStatus.geometry.width -
              (this._cardPropStatus._body === '' ? DRAG_IMAGE_MARGIN : 0) -
              this._cardCssStyle.borderWidth * 2;

            let newImageHeight = height;
            if (newImageWidth < width) {
              newImageHeight = (height * newImageWidth) / width;
            }
            else {
              newImageWidth = width;
            }

            newImageWidth = Math.floor(newImageWidth);
            newImageHeight = Math.floor(newImageHeight);

            const doc = CKEDITOR.instances.editor.document.$;
            const img = doc.getElementById(id);
            if (img) {
              img.setAttribute('width', `${newImageWidth}`);
              img.setAttribute('height', `${newImageHeight}`);
            }

            const windowWidth =
              newImageWidth +
              DRAG_IMAGE_MARGIN +
              this._cardCssStyle.borderWidth * 2 +
              shadowWidth;
            const geometryWidth = windowWidth - getRenderOffsetWidth();
            let windowHeight =
              newImageHeight +
              DRAG_IMAGE_MARGIN +
              document.getElementById('title')!.offsetHeight +
              this._cardCssStyle.borderWidth * 2 +
              shadowHeight;
            const geometryHeight = windowHeight - getRenderOffsetHeight();

            if (this._cardPropStatus._body === '') {
              this._cardPropStatus.geometry.height = geometryHeight;
            }
            else {
              this._cardPropStatus.geometry.height =
                this._cardPropStatus.geometry.height + newImageHeight;
              windowHeight = this._cardPropStatus.geometry.height + getRenderOffsetHeight();
            }

            window.api.setWindowSize(this._cardPropStatus.url, windowWidth, windowHeight);

            const data = this.endEdit();
            this._cardPropStatus._body = data;
            saveCard(this._cardPropStatus);
            render();
            // Workaround for at bug that an image cannot be resizable just after created by drag and drop.
            window.api.blurAndFocusWithSuppressFocusEvents(this._cardPropStatus.url);
          };
          const imgTag = this.getImageTag(id, file!.path, 1, 1, file!.name);
          evt.data.dataValue = imgTag;
          if (this._cardPropStatus._body === '') {
            saveCardColor(this._cardPropStatus, '#ffffff', '#ffffff', 0.0);
          }

          dropImg.src = file.path;
        }
      }
    });
  };

  showEditor = async (): Promise<void> => {
    if (this.isOpened) {
      return;
    }

    let contCounter = 0;
    for (;;) {
      let cont = false;
      // eslint-disable-next-line no-loop-func, no-await-in-loop
      await this._setData().catch(async err => {
        if (err.message === this._errorFailedToSetData) {
          await sleep(1000);
          contCounter++;
          cont = true;
        }
        else {
          // logger.error does not work in ipcRenderer event.
          console.error(`Error in showEditor ${this._cardPropStatus.url}: ${err.message}`);
          cont = false;
        }
      });
      if (contCounter >= 10) {
        cont = false;
        // logger.error does not work in ipcRenderer event.
        console.error(
          `Error in showEditor ${this._cardPropStatus.url}: too many setData errors`
        );
        window.api.alertDialog(
          this._cardPropStatus.url,
          'pleaseRestartErrorInOpeningEditor'
        );
      }
      if (cont) {
        // console.debug(`re-trying setData for ${this._cardPropStatus.id}`);
      }
      else {
        break;
      }
    }

    const contents = document.getElementById('contents');
    if (contents) {
      contents.style.visibility = 'hidden';
    }
    const ckeEditor = document.getElementById('cke_editor');
    if (ckeEditor) {
      ckeEditor.style.visibility = 'visible';
      const toolbar = document.getElementById('cke_1_bottom');
      if (toolbar) {
        toolbar.style.visibility = 'hidden';
      }
    }
    else {
      throw new Error('cke_editor does not exist.');
    }

    this._addDragAndDropEvent();

    this.isOpened = true;

    render(['TitleBar', 'EditorRect', 'EditorStyle']);
  };

  hideEditor = () => {
    this.isOpened = false;
    document.getElementById('contents')!.style.visibility = 'visible';
    document.getElementById('cke_editor')!.style.visibility = 'hidden';
  };

  startEdit = async () => {
    this._isEditing = true;
    render(['EditorStyle']);

    if (this._startEditorFirstTime) {
      this._startEditorFirstTime = false;
      await this._imeWorkaround();
    }

    // Expand card to add toolbar.
    const expandedHeight = this._cardPropStatus.geometry.height + this._toolBarHeight;
    window.api.setWindowSize(
      this._cardPropStatus.url,
      this._cardPropStatus.geometry.width,
      expandedHeight
    );
    setRenderOffsetHeight(this._toolBarHeight);
    render(['ContentsRect']);

    const toolbar = document.getElementById('cke_1_bottom');
    if (toolbar) {
      toolbar.style.visibility = 'visible';
      toolbar.style.bottom = shadowHeight + this._cardCssStyle.borderWidth + 'px';
    }

    await this.waitUntilActivationComplete();
    CKEDITOR.instances.editor.focus();
  };

  endEdit = (): string => {
    this._isEditing = false;

    // Save data to AvatarProp
    const data = CKEDITOR.instances.editor.getData();

    clearTimeout(this.execSaveCommandTimeout);

    saveCard(this._cardPropStatus);

    window.api.setWindowSize(
      this._cardPropStatus.url,
      this._cardPropStatus.geometry.width,
      this._cardPropStatus.geometry.height
    );
    setRenderOffsetHeight(0);
    render(['ContentsRect']);

    // Reset editor color to card color
    render(['TitleBar', 'EditorStyle']);

    const toolbar = document.getElementById('cke_1_bottom');
    if (toolbar) {
      toolbar.style.visibility = 'hidden';
    }

    // eslint-disable-next-line no-unused-expressions
    CKEDITOR.instances.editor.getSelection()?.removeAllRanges();

    return data;
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

    CKEDITOR.instances.editor.setMode('source', () => {});
    CKEDITOR.instances.editor.focus();

    // In code mode, editor background color is changed to white.
  };

  endCodeMode = async () => {
    this.isCodeMode = false;

    CKEDITOR.instances.editor.setMode('wysiwyg', () => {});
    await this.waitUntilActivationComplete();

    /*
     * Reset editor color to card color
     * and reset width and height of cke_wysiwyg_frame
     */
    render(['TitleBar', 'TitleBarStyle', 'EditorStyle', 'EditorRect']);

    CKEDITOR.instances.editor.focus();
  };

  getScrollPosition = () => {
    const left = CKEDITOR.instances.editor.document.$.scrollingElement!.scrollLeft;
    const top = CKEDITOR.instances.editor.document.$.scrollingElement!.scrollTop;
    return { left, top };
  };

  setScrollPosition = (left: number, top: number) => {
    CKEDITOR.instances.editor.document.$.scrollingElement!.scrollLeft = left;
    CKEDITOR.instances.editor.document.$.scrollingElement!.scrollTop = top;
  };

  setZoom = () => {
    if (this._cardPropStatus) {
      if (CKEDITOR.instances.editor.document && CKEDITOR.instances.editor.document.$.body) {
        CKEDITOR.instances.editor.document.$.body.style.zoom = `${this._cardPropStatus.style.zoom}`;
      }
    }
  };

  setSize = (
    width: number = this._cardPropStatus.geometry.width -
      this._cardCssStyle.borderWidth * 2 -
      shadowWidth,
    height: number = this._cardPropStatus.geometry.height -
      this._cardCssStyle.borderWidth * 2 -
      shadowHeight -
      document.getElementById('title')!.offsetHeight
  ): void => {
    // width of BrowserWindow (namely avatarProp.geometry.width) equals border + padding + content.
    const editor = CKEDITOR.instances.editor;
    if (editor) {
      CKEDITOR.instances.editor.resize(width, height);
      const iframe = document.getElementsByClassName('cke_wysiwyg_frame');
      if (iframe.item && iframe.item(0)) {
        (iframe.item(0) as HTMLElement).style.width =
          document.getElementById('cke_editor')!.offsetWidth + 'px';
        (iframe.item(0) as HTMLElement).style.height =
          document.getElementById('cke_editor')!.offsetHeight + 'px';
      }
    }
    else {
      console.error(`Error in setSize: editor is undefined.`);
    }

    const toolbar = document.getElementById('cke_1_bottom');
    toolbar!.style.width = width + 'px';

    const textcolorBtn = document.getElementsByClassName('cke_button__textcolor');
    const bgcolorBtn = document.getElementsByClassName('cke_button__bgcolor');
    (textcolorBtn!.item(0) as HTMLElement).style.display =
      width < 218 || height < 90 ? 'none' : 'block';
    (bgcolorBtn!.item(0) as HTMLElement).style.display =
      width < 252 || height < 90 ? 'none' : 'block';
  };

  setColor = (): void => {
    let backgroundRgba = convertHexColorToRgba(
      this._cardPropStatus.style.backgroundColor,
      this._cardPropStatus.style.opacity
    );
    let darkerRgba = convertHexColorToRgba(
      darkenHexColor(this._cardPropStatus.style.backgroundColor, 0.96),
      this._cardPropStatus.style.opacity
    );
    let uiRgba = convertHexColorToRgba(this._cardPropStatus.style.uiColor);

    if (this._cardPropStatus.style.opacity === 0 && this._isEditing) {
      backgroundRgba = 'rgba(255, 255, 255, 1.0)';
      darkerRgba = 'rgba(250, 250, 250, 1.0)';
      uiRgba = 'rgba(204, 204, 204, 1.0)';
    }

    const editor = document.getElementById('cke_editor');
    if (editor) {
      editor.style.borderTopColor = uiRgba;
    }
    const toolbar = document.getElementById('cke_1_bottom');
    if (toolbar) {
      toolbar.style.backgroundColor = toolbar.style.borderBottomColor = toolbar.style.borderTopColor = uiRgba;
    }

    const contents = document.querySelector(
      '#cke_1_contents .cke_wysiwyg_frame'
    ) as HTMLElement;
    if (contents) {
      contents.style.backgroundColor = backgroundRgba;
    }

    const scrollBarRgba = darkenHexColor(this._cardPropStatus.style.backgroundColor, 0.85);
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
  };

  execAfterMouseDown = (func: () => Promise<void>) => {
    CKEDITOR.instances.editor.document.once('mousedown', e => func());
  };
}
