type MessagesMain = {
  databaseCreateError: string;
  exit: string;
  zoomIn: string;
  zoomOut: string;
  bringToFront: string;
  sendToBack: string;
  newCard: string;
  newCardFromTray: string;
  newCardFromSelection: string;
  openOriginalCard: string;
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
  syncNow: string;
  // lockCard: string;
  // unlockCard: string;
  cut: string;
  copy: string;
  copyAsMarkdown: string;
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
  addToDictionary: string;
  saveSnapshot: string;
  snapshotName: string;
  redisplayCards: string;
  minimizeAllCards: string;
  transformToLabel: string;
  transformFromLabel: string;
  copyOf: string;
  copyCardViewLink: string;
};

type MessagesNote = {
  note: string;
  noteNew: string;
  firstNoteName: string;
  noteName: string;
  noteMove: string;
  noteCopy: string;
  noteCardExist: string;
  noteRename: string;
  noteDelete: string;
  noteCannotDelete: string;
  noteNewName: string;
  noteDuplicate: string;
  noteNewNameDuplicate: string;
  residentNoteName: string;
  noteCopyLinkToClipboard: string;
  noteCreateLink: string;
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
  saveFilePath: string;
  saveChangeFilePathButton: string;
  chooseSaveFilePath: string;
  saveChangeFilePathAlert: string;
  saveChangeFilePathError: string;
  saveZOrder: string;
  languageDetailedText: string;
  currentLanguage: string;
  selectableLanguages: string;
  securityDetailedText: string;
  securityNoUrl: string;
  aboutCopyright: string;
  aboutAppUrl: string;
  testingSync: string;
  syncRemoteUrlHeader: string;
  syncRemoteUrlPlaceholder: string;
  syncPersonalAccessTokenHeader: string;
  syncPersonalAccessTokenFooter: string;
  syncPersonalAccessTokenPlaceholder: string;
  syncIntervalHeader: string;
  syncIntervalAlert: string;
  syncAfterChangesHeader: string;
  saveSyncSettingsButton: string;
  reloadNotebookByCombine: string;
  invalidSchemaVersion: string;
  importConfirmation: string;
  importSyncAlert: string;
  importingDataProgressBarTitle: string;
  importingDataProgressBarBody: string;
  importingDataProgressBarProgress: string;
  synchronizingProgressBarTitle: string;
  synchronizingProgressBarBody: string;
  startingAppProgressBarTitle: string;
  loadingNoteBookProgressBarBody: string;
  loadingNoteProgressBarTitle: string;
  loadingNoteProgressBarBody: string;
  duplicatingNoteProgressBarTitle: string;
  duplicatingNoteProgressBarBody: string;
  completed: string;
  loadingNoteFailed: string;
  exportDataAlert: string;
  rebuildIndexLabel: string;
  rebuildIndexButton: string;
};

type MessagesDashboard = {
  dashboard: string;
  dashboardWithShortcut: string;
  dashboardPageSearch: string;
  dashboardPageSpace: string;
  dashboardInputSpaceOrKeyword: string;
  dashboardInputSpace: string;
  cloneCardsConfirmation: string;
  dashboardReferenceNotExist: string;
  copyToCurrentSpace: string;
  copyLink: string;
};

type MessagesLanguage = {
  en: string;
  ja: string;
};

export type MessagesRenderer = {
  exitCode: string;
};
export type MessageLabelRenderer = keyof MessagesRenderer;

export type Messages = MessagesMain &
  MessagesNote &
  MessagesSettings &
  MessagesLanguage &
  MessagesDashboard &
  MessagesRenderer;
export type MessageLabel = keyof Messages;

const LANGUAGES_COMMON: MessagesLanguage = {
  en: 'ENGLISH',
  ja: '日本語(JAPANESE)',
};

const NOTE_ENGLISH: MessagesNote = {
  note: 'Space',
  noteNew: 'New space...',
  firstNoteName: '#Workspace',
  noteName: 'Space $1',
  noteMove: 'Move to',
  noteCopy: 'Copy to',
  noteCardExist: 'The same card already exists on the space.',
  noteRename: 'Rename this space',
  noteDelete: 'Delete this space',
  noteCannotDelete:
    'To delete space, delete all cards in this space or move them to another space.',
  noteNewName: 'Enter new space name',
  noteDuplicate: 'Duplicate this space',
  noteNewNameDuplicate: 'Enter duplicated space name',
  residentNoteName: 'Resident space',
  noteCopyLinkToClipboard: 'Copy link to space',
  noteCreateLink: 'Create link to space',
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
  saveFilePath: 'Save automatically in',
  saveChangeFilePathButton: 'Change',
  chooseSaveFilePath: 'Select the place for saving data',
  saveChangeFilePathAlert:
    'Save data will be copied from the old folder to the new folder.\n(The data in the old folder is not removed.) \n[petasti_data] folder will be created in the new folder,\n  and save data is saved in this folder.',
  saveChangeFilePathError: 'Data cannot be copied here. Please select another location.',
  saveZOrder: 'Save the order of card overlap',
  languageDetailedText: 'Select the Language in which you want this App to appear',
  currentLanguage: 'Current Language',
  selectableLanguages: 'Selectable Languages',
  securityDetailedText:
    'Only following websites are allowed to load into a card. Remove by clicking \u00D7 if not needed.',
  securityNoUrl: 'No URL allowed',
  aboutCopyright: '© 2023 Hidekazu Kubota',
  aboutAppUrl: 'https://github.com/sosuisen/',
  testingSync: 'Testing synchronization...',
  syncRemoteUrlHeader: 'Remote repository (GitHub URL)',
  syncRemoteUrlPlaceholder: 'e.g.) https://github.com/your_account/your_repository',
  syncPersonalAccessTokenHeader: 'Personal Access Token',
  syncPersonalAccessTokenFooter:
    'Enter <a target="_blank" href="https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token">your personal access token</a>.',
  syncPersonalAccessTokenPlaceholder: 'e.g) ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  syncIntervalHeader: 'Interval (10 or more secs)',
  syncIntervalAlert: 'Please enter a number greater than or equal to 10.',
  syncAfterChangesHeader: 'Ignore interval and sync when card is saved.',
  saveSyncSettingsButton: 'Apply sync settings',
  reloadNotebookByCombine: 'App will be restarted to update the database.',
  invalidSchemaVersion: 'Cannot import this data because the version (ver.$1) is invalid.',
  importConfirmation:
    'Imports data from a file. The current data will be overwritten and erased. Are you sure you want to proceed?',
  importSyncAlert:
    'Synchronization has been stopped. Before resuming synchronization again, please delete the remote repository that is currently being synchronized. If you do not delete it, the data in the remote repository will be merged into the imported data after the synchronization.',
  importingDataProgressBarTitle: 'Importing...',
  importingDataProgressBarBody:
    'Please do not manipulate the cards or spaces during the import process.',
  importingDataProgressBarProgress: 'Import $1 out of $2',
  synchronizingProgressBarTitle: 'Synchronizing...',
  synchronizingProgressBarBody: 'Checking remote data...',
  startingAppProgressBarTitle: 'Starting...',
  loadingNoteBookProgressBarBody: 'Checking spaces...',
  loadingNoteProgressBarTitle: 'Loading...',
  loadingNoteProgressBarBody: 'Loading cards...',
  duplicatingNoteProgressBarTitle: 'Duplicating space...',
  duplicatingNoteProgressBarBody: 'Duplicating all cards...',
  completed: 'Completed',
  loadingNoteFailed: 'Failed to load cards.',
  exportDataAlert:
    'Only current cards, spaces, and snapshots will be exported. Past changes and deleted data will not be included.',
  rebuildIndexLabel: 'Rebuild index',
  rebuildIndexButton: 'Rebuild',
};

const RENDERER_ENGLISH: MessagesRenderer = {
  exitCode: 'Press $1+Shift+Down to exit the code',
};

const DASHBOARD_ENGLISH: MessagesDashboard = {
  dashboard: 'Dashboard',
  dashboardWithShortcut: 'Dashboard  (Ctrl+AltOrOpt+Enter)',
  dashboardPageSearch: 'Search',
  dashboardPageSpace: 'Space',
  dashboardInputSpaceOrKeyword: 'Input space name or keyword',
  dashboardInputSpace: 'Input space name',
  cloneCardsConfirmation:
    'Copy all search result cards to this space. Are you sure you want to proceed?',
  dashboardReferenceNotExist: 'There is no space on which this card is placed.',
  copyToCurrentSpace: 'Copy to current space',
  copyLink: 'Copy link',
};

export const messageLabelsForRenderer: MessageLabelRenderer[] = Object.keys(
  RENDERER_ENGLISH
) as MessageLabelRenderer[];

export const ENGLISH: Messages = {
  ...LANGUAGES_COMMON,
  ...NOTE_ENGLISH,
  ...SETTINGS_ENGLISH,
  ...RENDERER_ENGLISH,
  ...DASHBOARD_ENGLISH,
  databaseCreateError: 'Error: Cannot create database($1)',
  exit: 'Exit',
  zoomIn: 'Zoom In  (Ctrl+ +)',
  zoomOut: 'Zoom Out  (Ctrl+ -)',
  bringToFront: 'Bring to Front',
  sendToBack: 'Send to Back',
  newCard: 'New card  (CtrlOrCmd+N)',
  newCardFromTray: 'New card (Ctrl+AltOrOpt+N)',
  newCardFromSelection: 'New card from selection',
  openOriginalCard: 'Open the original card',
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
  syncError: 'Error: Cannot sync with remote($1)',
  btnCloseCard: 'Close card',
  btnOK: 'OK',
  btnAllow: 'Allow',
  btnCancel: 'Cancel ', // 'Cancel' is automatically translated to local language, so add use 'Cancel '.
  btnRemove: 'Remove',
  settings: 'Settings',
  syncNow: 'Sync now',
  // lockCard: 'Lock card',
  // unlockCard: 'Unlock card',
  cut: 'Cut',
  copy: 'Copy',
  copyAsMarkdown: 'Copy as markdown',
  paste: 'Paste',
  pasteAndMatchStyle: 'Paste and match style  (CtrlOrCmd+Shfit+V)',
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
  addToDictionary: 'Add to dictionary',
  saveSnapshot: 'Save snapshot',
  snapshotName: 'Enter snapshot name',
  redisplayCards: 'Bring all cards to front  (Ctrl+AltOrOpt+F)',
  minimizeAllCards: 'Hide all cards  (Ctrl+AltOrOpt+B)',
  transformToLabel: 'Labelize  (Ctrl+AltOrOpt+Space)',
  transformFromLabel: 'Open label  (Ctrl+AltOrOpt+Space)',
  copyOf: '-copy',
  copyCardViewLink: 'Copy link to this card',
};

const NOTE_JAPANESE: MessagesNote = {
  note: 'スペース',
  noteNew: '新規スペース...',
  firstNoteName: '#ワークスペース',
  noteName: 'スペース $1',
  noteMove: '移動',
  noteCopy: 'コピーを作成',
  noteCardExist: 'コピー先には既に同じカードがあります。',
  noteRename: 'スペース名を変更',
  noteDelete: 'このスペースを削除',
  noteCannotDelete:
    'スペースを削除するには、このスペースのカードを全て削除するか他のスペースへ移動してください。',
  noteNewName: '新しいスペース名を入力してください',
  noteDuplicate: 'スペースを複製',
  noteNewNameDuplicate: '複製先のスペース名を入力してください',
  residentNoteName: '常駐スペース',
  noteCopyLinkToClipboard: 'スペースへのリンクをコピー',
  noteCreateLink: 'スペースへのリンクを作成',
};

const SETTINGS_JAPANESE: MessagesSettings = {
  settingsDialog: '設定',
  settingPageLanguage: '言語',
  settingPageSync: '同期',
  settingPageSave: 'データ保存',
  settingPageAbout: 'アプリの情報',
  exportData: '書き出し（JSON形式）',
  exportDataButton: '書き出し先を選択',
  importData: '読み込み（JSON形式）',
  importDataButton: '読み込み元ファイルを選択',
  saveFilePath: 'このフォルダに自動保存',
  saveChangeFilePathButton: '変更',
  chooseSaveFilePath: 'データの保存先を選んでください',
  saveChangeFilePathAlert:
    'データは新しい保存先へコピーされます（元の保存先からは削除されません）\n保存先には「petasti_data」という名前のフォルダが作成され、\nデータはこのフォルダの中に保存されます。',
  saveChangeFilePathError: 'データをコピーできませんでした。他の保存先を選んでください。',
  saveZOrder: 'カードの重なり順を保存する',
  languageDetailedText: 'このアプリのメニュー表示のために使用する言語を選んでください。',
  currentLanguage: '使用中の言語',
  selectableLanguages: '選択可能な言語',
  securityDetailedText:
    '次のドメインのサイトのみカードに読み込むことができます。不要なサイトは×ボタンを押して削除してください。',
  securityNoUrl: '許可されたサイトはありません',
  aboutCopyright: '© 2023 Hidekazu Kubota',
  aboutAppUrl: 'https://github.com/sosuisen/',
  testingSync: '同期のテスト中...',
  syncRemoteUrlHeader: '同期先のリポジトリ (GitHub URL)',
  syncRemoteUrlPlaceholder: '例) https://github.com/your_account/your_repository',
  syncPersonalAccessTokenHeader: '個人アクセストークン',
  syncPersonalAccessTokenFooter:
    'あなたの<a target="_blank" href="https://docs.github.com/ja/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token">個人アクセストークン</a>を入力してください。',
  syncPersonalAccessTokenPlaceholder: '例) ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  syncIntervalHeader: '間隔（10秒以上）',
  syncIntervalAlert: '10秒以上の値を入力してください',
  syncAfterChangesHeader: 'カード保存時は間隔を無視して同期実行',
  saveSyncSettingsButton: '同期設定を保存',
  reloadNotebookByCombine: 'データベース更新のためアプリが再起動されます。',
  invalidSchemaVersion:
    'このバージョン（ver.$1）のデータをインポートすることはできません。',
  importConfirmation:
    'データをファイルからインポートします。現在のデータは上書きで消去されます。進めてよろしいですか？',
  importSyncAlert:
    '同期を停止しました。同期を再開する前に、現在の同期先のリモートリポジトリを削除してください。削除しない場合、同期時にリモートリポジトリのデータがインポートしたデータへ結合されます。',
  importingDataProgressBarTitle: 'インポート中...',
  importingDataProgressBarBody:
    'インポート処理中はカードやスペースを操作しないようお願いします。',
  importingDataProgressBarProgress: '$2 個のうち $1 個をインポートしました',
  synchronizingProgressBarTitle: '同期中...',
  synchronizingProgressBarBody: 'リモートのデータを確認しています...',
  startingAppProgressBarTitle: '起動中...',
  loadingNoteBookProgressBarBody: 'スペースのデータを確認しています...',
  loadingNoteProgressBarTitle: '読み込み中...',
  loadingNoteProgressBarBody: 'カードを読み込み中...',
  duplicatingNoteProgressBarTitle: 'スペースを複製中...',
  duplicatingNoteProgressBarBody: '全カードを複製しています...',
  completed: '完了しました',
  loadingNoteFailed: 'カードの読み込みを失敗しました',
  exportDataAlert:
    '現在のカード、スペース、スナップショットのみエクスポートされます。過去の変更履歴や削除されたデータは含まれません。',
  rebuildIndexLabel: 'インデックス再構築',
  rebuildIndexButton: '再構築',
};

const RENDERER_JAPANESE: MessagesRenderer = {
  exitCode: '$1+Shift+ ↓ でカーソルをコード外へ',
};

const DASHBOARD_JAPANESE: MessagesDashboard = {
  dashboard: 'ダッシュボード',
  dashboardWithShortcut: 'ダッシュボード  (Ctrl+AltOrOpt+Enter)',
  dashboardPageSearch: '検索',
  dashboardPageSpace: 'スペース',
  dashboardInputSpaceOrKeyword: 'スペース名またはキーワードを入力',
  dashboardInputSpace: 'スペース名を入力',
  cloneCardsConfirmation:
    '検索結果のカードを全てこのスペースへコピーします。進めてよろしいですか？',
  dashboardReferenceNotExist: 'このカードを配置しているスペースはありません',
  copyToCurrentSpace: '現在のスペースへコピーする',
  copyLink: 'リンクをコピーする',
};

export const JAPANESE: Messages = {
  ...LANGUAGES_COMMON,
  ...NOTE_JAPANESE,
  ...SETTINGS_JAPANESE,
  ...RENDERER_JAPANESE,
  ...DASHBOARD_JAPANESE,
  databaseCreateError: 'エラー：データベースを作成できませんでした。($1)',
  exit: '終了',
  zoomIn: '拡大 (Ctrl+ +)',
  zoomOut: '縮小 (Ctrl+ -)',
  bringToFront: '最前面へ',
  sendToBack: '最背面へ',
  newCard: '新規カード  (CtrlOrCmd+N)',
  newCardFromTray: '新規カード  (Ctrl+AltOrOpt+N)',
  newCardFromSelection: '選択範囲から新規カード',
  openOriginalCard: 'オリジナルのカードを開く',
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
  syncError:
    'エラー：リモートと同期することができませんでした。同期を再設定してください。($1)',
  btnCloseCard: 'カードを閉じる',
  btnOK: 'はい',
  btnAllow: '許可する',
  btnCancel: 'キャンセル',
  btnRemove: '削除する',
  settings: '設定',
  syncNow: '今すぐ同期',
  // lockCard: 'ロックする',
  // unlockCard: 'ロック解除する',
  cut: '切り取り',
  copy: 'コピー',
  copyAsMarkdown: 'コピー（Markdown形式）',
  paste: '貼り付け',
  pasteAndMatchStyle: '貼り付け（書式なし）(CtrlOrCmd+Shift+V)',
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
  addToDictionary: '辞書に追加',
  saveSnapshot: 'スナップショット保存',
  snapshotName: 'スナップショット名を入力してください',
  redisplayCards: '全カードを前面に表示  (Ctrl+AltOrOpt+F)',
  minimizeAllCards: '全カードを隠す  (Ctrl+AltOrOpt+B)',
  transformToLabel: 'ラベルにする  (Ctrl+AltOrOpt+Space)',
  transformFromLabel: 'ラベルを開く  (Ctrl+AltOrOpt+Space)',
  copyOf: 'のコピー',
  copyCardViewLink: 'このカードのリンクをコピー',
};

export const availableLanguages = ['en', 'ja'];
export const defaultLanguage = 'en';

export const allMessages: Record<string, Messages> = {
  en: ENGLISH,
  ja: JAPANESE,
};
