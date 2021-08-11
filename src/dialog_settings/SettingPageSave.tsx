/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';
import * as React from 'react';
import { ipcRenderer } from 'electron';
import fs from 'fs-extra';
import { GlobalContext, GlobalProvider } from './StoreProvider';
import './SettingPageSave.css';
import { MenuItemProps } from './MenuItem';
import { SettingPageTemplate } from './SettingPageTemplate';
import { MessageLabel } from '../modules_common/i18n';
import { ColorName, uiColors } from '../modules_common/color';
import { cardDirName } from '../modules_common/store_settings.types';
import { DialogButton } from '../modules_common/const';
import { getCurrentDateAndTime } from '../modules_common/utils';

export interface SettingPageSaveProps {
  item: MenuItemProps;
  index: number;
}

export const SettingPageSave = (props: SettingPageSaveProps) => {
  const [globalState, globalDispatch] = React.useContext(GlobalContext) as GlobalProvider;
  const MESSAGE = (label: MessageLabel) => {
    return globalState.temporal.messages[label];
  };
  const onChangeButtonClick = async () => {
    const file = await ipcRenderer
      .invoke('open-directory-selector-dialog', MESSAGE('chooseSaveFilePath'))
      .catch(e => {
        console.error(`Failed to open directory selector dialog: ${e.me}`);
      });
    if (file) {
      await ipcRenderer.invoke('close-cardio').catch(e => {
        console.error(`Failed to close cardio: ${e.me}`);
      });
      //      console.debug(file);
      const newPath = file[0];
      ipcRenderer
        .invoke(
          'confirm-dialog',
          'settingsDialog',
          ['btnOK', 'btnCancel'],
          'saveChangeFilePathAlert'
        )
        .then((res: number) => {
          if (res === DialogButton.Default) {
            // OK
            const saveDir = path.join(newPath, cardDirName);
            try {
              fs.ensureDirSync(saveDir, 0o700); // owner のみ rwx
              fs.copySync(globalState.persistent.storage.path, saveDir);
              globalDispatch({
                type: 'storage-put',
                payload: { type: 'local', path: saveDir },
              });
            } catch (e) {
              console.error(e);
              ipcRenderer.invoke(
                'alert-dialog',
                'settingsDialog',
                'saveChangeFilePathError'
              );
            }
          }
          else if (res === DialogButton.Cancel) {
            // Cancel
          }
        })
        .catch((e: Error) => {
          console.error(e.message);
        });
    }
  };
  const onExportDataButtonClick = async () => {
    const file = await ipcRenderer
      .invoke('open-directory-selector-dialog', MESSAGE('exportDataButton'))
      .catch(e => {
        console.error(`Failed to open directory selector dialog: ${e.me}`);
      });
    if (file) {
      const filepath =
        file[0] +
        '/tree_stickies_' +
        getCurrentDateAndTime()
          .replace(/\s/g, '_')
          .replace(/:/g, '') +
        '.json';
      await ipcRenderer.invoke('export-data-to', filepath);
    }
  };

  const onImportDataButtonClick = async () => {
    const file = await ipcRenderer
      .invoke('open-file-selector-dialog', MESSAGE('importDataButton'))
      .catch(e => {
        console.error(`Failed to open file selector dialog: ${e.me}`);
      });
    if (file) {
      const filepath = file[0];
      console.debug(filepath);
      // await ipcRenderer.invoke('export-data-to', filepath);
      await ipcRenderer.invoke('import-data-from', filepath);
    }
  };

  const buttonStyle = (color: ColorName) => ({
    backgroundColor: uiColors[color],
  });
  return (
    <SettingPageTemplate item={props.item} index={props.index}>
      <p>{MESSAGE('saveDetailedText')}</p>
      <input type='radio' styleName='locationSelector' checked />
      <div styleName='saveFilePath'>
        <div styleName='saveFilePathLabel'>{MESSAGE('saveFilePath')}:</div>
        <button
          styleName='saveChangeFilePathButton'
          onClick={onChangeButtonClick}
          style={buttonStyle('red')}
        >
          {MESSAGE('saveChangeFilePathButton')}
        </button>
        <div styleName='saveFilePathValue'>{globalState.persistent.storage.path}</div>
      </div>
      <br style={{ clear: 'both' }} />
      <hr></hr>
      <div styleName='exportData'>
        <div styleName='exportDataLabel'>{MESSAGE('exportData')}:</div>
        <button
          styleName='exportDataButton'
          onClick={onExportDataButtonClick}
          style={buttonStyle('red')}
        >
          {MESSAGE('exportDataButton')}
        </button>
      </div>
      <div styleName='importData'>
        <div styleName='importDataLabel'>{MESSAGE('importData')}:</div>
        <button
          styleName='importDataButton'
          onClick={onImportDataButtonClick}
          style={buttonStyle('red')}
        >
          {MESSAGE('importDataButton')}
        </button>
      </div>
    </SettingPageTemplate>
  );
};
