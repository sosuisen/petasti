type MessagesMain = {
  databaseCreateError: string;
  exit: string;
  zoomIn: string;
  zoomOut: string;
  bringToFront: string;
  sendToBack: string;
  newCard: string;
  confirmClosing: string;
  confirmWaitMore: string;
  pleaseRestartErrorInOpeningEditor: string;
  securityPageNavigationAlert: string;
  securityLocalNavigationError: string;
  syncError: string;
  btnCloseCard: string;
  btnOK: string;
  btnAllow: string;
  btnCancel: string;
  btnRemove: string;
  settings: string;
  lockCard: string;
  unlockCard: string;
  cut: string;
  copy: string;
  paste: string;
  pasteAndMatchStyle: string;
  white: string;
  yellow: string;
  red: string;
  green: string;
  blue: string;
  orange: string;
  purple: string;
  gray: string;
  lightgray: string;
  transparent: string;
};

type MessagesNote = {
  note: string;
  noteNew: string;
  noteName: string;
  noteMove: string;
  noteCopy: string;
  noteAvatarExist: string;
  noteRename: string;
  noteDelete: string;
  noteCannotDelete: string;
  noteNewName: string;
};

type MessagesSettings = {
  settingsDialog: string;
  settingPageLanguage: string;
  settingPageSync: string;
  settingPageSave: string;
  settingPageAbout: string;
  exportData: string;
  exportDataButton: string;
  importData: string;
  importDataButton: string;
  saveDetailedText: string;
  saveFilePath: string;
  saveChangeFilePathButton: string;
  chooseSaveFilePath: string;
  saveChangeFilePathAlert: string;
  saveChangeFilePathError: string;
  languageDetailedText: string;
  currentLanguage: string;
  selectableLanguages: string;
  securityDetailedText: string;
  securityNoUrl: string;
  aboutCopyright: string;
  aboutAppUrl: string;
};

type MessagesLanguage = {
  en: string;
  ja: string;
};

export type Messages = MessagesMain & MessagesNote & MessagesSettings & MessagesLanguage;

export type MessageLabel = keyof Messages;

const LANGUAGES_COMMON: MessagesLanguage = {
  en: 'ENGLISH',
  ja: '日本語(JAPANESE)',
};

const NOTE_ENGLISH: MessagesNote = {
  note: 'Note',
  noteNew: 'New note...',
  noteName: 'Note $1',
  noteMove: 'Move',
  noteCopy: 'Copy Avatar',
  noteAvatarExist: 'Avatar already exists on the note.',
  noteRename: 'Rename this note',
  noteDelete: 'Delete this note',
  noteCannotDelete:
    'To delete note, delete all visible cards or move them to another note.',
  noteNewName: 'Enter new note name',
};

const SETTINGS_ENGLISH: MessagesSettings = {
  settingsDialog: 'Settings',
  settingPageLanguage: 'Language',
  settingPageSync: 'Sync',
  settingPageSave: 'Data Save',
  settingPageAbout: 'About',
  exportData: 'Export data (JSON format) by hand',
  exportDataButton: 'Select folder',
  importData: 'Import data (JSON format) by hand',
  importDataButton: 'Select file',
  saveDetailedText: 'Save data automatically to the following location',
  saveFilePath: 'Save in the folder of',
  saveChangeFilePathButton: 'Change',
  chooseSaveFilePath: 'Select the place for saving data',
  saveChangeFilePathAlert:
    'Save data will be copied from the old folder to the new folder.\n(The data in the old folder is not removed.) \n[tree_stickies_data] folder will be created in the new folder,\n  and save data is saved in this folder.',
  saveChangeFilePathError: 'Data cannot be copied here. Please select another location.',
  languageDetailedText: 'Select the Language in which you want this App to appear',
  currentLanguage: 'Current Language',
  selectableLanguages: 'Selectable Languages',
  securityDetailedText:
    'Only following websites are allowed to load into a card. Remove by clicking \u00D7 if not needed.',
  securityNoUrl: 'No URL allowed',
  aboutCopyright: '© 2021 Hidekazu Kubota',
  aboutAppUrl: 'https://github.com/sosuisen/',
};
export const ENGLISH: Messages = {
  ...LANGUAGES_COMMON,
  ...NOTE_ENGLISH,
  ...SETTINGS_ENGLISH,
  databaseCreateError: 'Error: Cannot create database',
  exit: 'Exit',
  zoomIn: 'Zoom In',
  zoomOut: 'Zoom Out',
  bringToFront: 'Bring to Front',
  sendToBack: 'Send to Back',
  newCard: 'New card',
  confirmClosing:
    'Close OK?\n\nThe closed card is not deleted, and can be opened again in the near future update.\n(If you want to delete the card, let it empty before closing it.)',
  confirmWaitMore:
    'It takes a long time to save. Do you want to wait a little longer?\n\nIf you press Cancel, your changes will not be saved.',
  pleaseRestartErrorInOpeningEditor:
    'The card cannot be edited.\nPlease close this app and any other apps, and then open this app again.',
  securityPageNavigationAlert:
    'Trying to open external website $1. Allow if you think it is safe, otherwise it must be removed.',
  securityLocalNavigationError:
    'Script is trying to open $1, but it cannot be allowed. The card will be removed.',
  syncError: 'Error: Cannot sync with remote',
  btnCloseCard: 'Close card',
  btnOK: 'OK',
  btnAllow: 'Allow',
  btnCancel: 'Cancel ', // 'Cancel' is automatically translated to local language, so add use 'Cancel '.
  btnRemove: 'Remove',
  settings: 'Settings...',
  lockCard: 'Lock card',
  unlockCard: 'Unlock card',
  cut: 'Cut',
  copy: 'Copy',
  paste: 'Paste',
  pasteAndMatchStyle: 'Paste and match style',
  white: 'white',
  yellow: 'yellow',
  red: 'red',
  green: 'green',
  blue: 'blue',
  orange: 'orange',
  purple: 'purple',
  gray: 'gray',
  lightgray: 'lightgray',
  transparent: 'transparent',
};

const NOTE_JAPANESE: MessagesNote = {
  note: 'ノート',
  noteNew: '新規ノート...',
  noteName: 'ノート $1',
  noteMove: '移動',
  noteCopy: '分身をコピー',
  noteAvatarExist: 'コピー先には既に分身があります。',
  noteRename: 'ノート名を変更',
  noteDelete: 'このノートを削除',
  noteCannotDelete:
    'ノートを削除するには、表示されているカードを全て削除するか他のノートへ移動してください。',
  noteNewName: '新しいノート名を入力してください',
};

const SETTINGS_JAPANESE: MessagesSettings = {
  settingsDialog: '設定',
  settingPageLanguage: '言語',
  settingPageSync: '同期',
  settingPageSave: 'データ保存',
  settingPageAbout: 'アプリの情報',
  exportData: '手動で書き出し（JSON形式）',
  exportDataButton: '書き出し先を選択',
  importData: '手動で読み込み（JSON形式）',
  importDataButton: '読み込み元ファイルを選択',
  saveDetailedText: '自動的に次の場所へ保存',
  saveFilePath: 'このフォルダに保存',
  saveChangeFilePathButton: '変更',
  chooseSaveFilePath: 'データの保存先を選んでください',
  saveChangeFilePathAlert:
    'データは新しい保存先へコピーされます（元の保存先からは削除されません）\n保存先には「tree_stickies_data」という名前のフォルダが作成され、\nデータはこのフォルダの中に保存されます。',
  saveChangeFilePathError: 'データをコピーできませんでした。他の保存先を選んでください。',
  languageDetailedText: 'このアプリのメニュー表示のために使用する言語を選んでください。',
  currentLanguage: '使用中の言語',
  selectableLanguages: '選択可能な言語',
  securityDetailedText:
    '次のドメインのサイトのみカードに読み込むことができます。不要なサイトは×ボタンを押して削除してください。',
  securityNoUrl: '許可されたサイトはありません',
  aboutCopyright: '© 2021 Hidekazu Kubota',
  aboutAppUrl: 'https://github.com/sosuisen/',
};
export const JAPANESE: Messages = {
  ...LANGUAGES_COMMON,
  ...NOTE_JAPANESE,
  ...SETTINGS_JAPANESE,
  databaseCreateError: 'エラー：データベースを作成できませんでした。',
  exit: '終了',
  zoomIn: '拡大',
  zoomOut: '縮小',
  bringToFront: '最前面へ',
  sendToBack: '最背面へ',
  newCard: '新規カード',
  confirmClosing:
    'カードを閉じても良いですか？\n\n閉じたカードは削除されず、近い将来のアップデートで再表示できるようになります。\n（カードを削除したい場合は、カードの内容を全て消してから閉じてください）',
  confirmWaitMore:
    '保存に時間が掛かっています。もう少し待ちますか？\n\nキャンセルを押すと、変更した内容は保存されない場合があります。',
  pleaseRestartErrorInOpeningEditor:
    'カードを編集できません。\n本アプリと他のアプリを全て閉じた後、本アプリをもう一度開いてください。',
  securityPageNavigationAlert:
    '外部サイト $1 を開こうとしています。安全な場合のみ許可してください。\n許可しない場合、このカードは削除されます。',
  securityLocalNavigationError:
    'スクリプトが $1 を開こうとしていますが、許可できません。このカードを削除します。',
  syncError: 'エラー：リモートと同期することができませんでした。同期を再設定してください。',
  btnCloseCard: 'カードを閉じる',
  btnOK: 'はい',
  btnAllow: '許可する',
  btnCancel: 'キャンセル',
  btnRemove: '削除する',
  settings: '設定...',
  lockCard: 'ロックする',
  unlockCard: 'ロック解除する',
  cut: '切り取り',
  copy: 'コピー',
  paste: '貼り付け',
  pasteAndMatchStyle: '貼り付け（書式なし）',
  white: '白',
  yellow: '黄',
  red: '赤',
  green: '緑',
  blue: '青',
  orange: 'オレンジ',
  purple: '紫',
  gray: 'グレー',
  lightgray: 'ライトグレー',
  transparent: '透明',
};

export const availableLanguages = ['en', 'ja'];
export const defaultLanguage = 'en';
