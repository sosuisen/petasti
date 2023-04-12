/**
 * Petasti
 * © 2022 Hidekazu Kubota
 */
import * as React from 'react';
import { useState } from 'react';
import './SettingPageSave.css';
import { useDispatch, useSelector } from 'react-redux';
import { MenuItemProps } from './MenuItem';
import { SettingPageTemplate } from './SettingPageTemplate';
import { ColorName, uiColors } from '../modules_common/color';
import { DIALOG_BUTTON } from '../modules_common/const';
import { selectorDataStorePath, selectorMessages, selectorSettings } from './selector';
import { dataDirName } from '../modules_common/store.types';
import { settingsSaveZOrderUpdateCreator } from './action_creator';
import window from './window';
import { Toggle } from './Toggle';

export interface SettingPageSaveProps {
  item: MenuItemProps;
  index: number;
}

export function SettingPageSave (props: SettingPageSaveProps) {
  const dispatch = useDispatch();
  const messages = useSelector(selectorMessages);
  const dataStorePath = useSelector(selectorDataStorePath);

  const settings = useSelector(selectorSettings);
  const [saveZOrderValue, setSaveZOrderValue] = useState(
    settings.saveZOrder
  );


  const onChangeButtonClick = async () => {
    /* Use window.api
    const file = await ipcRenderer
      .invoke('open-directory-selector-dialog', messages.chooseSaveFilePath)
      .catch(e => {
        console.error(`Failed to open directory selector dialog: ${e.me}`);
      });
    if (file) {


       // TODO: pause sync while copying files
      
       
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
          if (res === DIALOG_BUTTON.ok) {
            // OK
            const saveDir = path.join(newPath, dataDirName);
            try {
              fs.ensureDirSync(saveDir, 0o700); // owner のみ rwx
              fs.copySync(dataStorePath, saveDir);
              dispatch(settingsDataStorePathUpdateCreator(saveDir));
            } catch (e) {
              console.error(e);
              ipcRenderer.invoke(
                'alert-dialog',
                'settingsDialog',
                'saveChangeFilePathError'
              );
            }
          }
          else if (res === DIALOG_BUTTON.cancel) {
            // Cancel
          }
        })
        .catch((e: Error) => {
          console.error(e.message);
        });
    }
            */
  };

  const onExportDataButtonClick = async () => {
    await window.api
      .db({
        command: 'export-data',
      })
      .catch(e => {
        console.error(`Failed to open directory selector dialog: ${e.message}`);
      });
  };

  const onImportDataButtonClick = async () => {
    await window.api
      .db({
        command: 'import-data',
      })
      .catch(e => {
        console.error(`Failed to open directory selector dialog: ${e.message}`);
      });
  };

  const saveZOrderToggleOnChange = (saveZOrder: boolean) => {
    setSaveZOrderValue(saveZOrder);
    dispatch(settingsSaveZOrderUpdateCreator(saveZOrder));
  };

  const buttonStyle = (color: ColorName) => ({
    backgroundColor: uiColors[color],
  });

  return (
    <SettingPageTemplate item={props.item} index={props.index}>
      <div styleName='saveFilePath'>
        <div styleName='saveFilePathLabel'>{messages.saveFilePath}:</div>
        <button
          styleName='saveChangeFilePathButton'
          onClick={onChangeButtonClick}
          style={buttonStyle('red')}
        >
          {messages.saveChangeFilePathButton}
        </button>
        <div styleName='saveFilePathValue'>{dataStorePath}</div>
      </div>
      <div styleName='saveZOrderHeader'>{messages.saveZOrder}</div>
      <div styleName='saveZOrderToggleButton'>
        <Toggle
          color={uiColors.gray}
          activeColor={uiColors.red}
          checked={saveZOrderValue}
          onChange={bool => saveZOrderToggleOnChange(bool)}
          size='small'
        />
      </div>
      <br style={{ clear: 'both' }} />
      <hr></hr>
      <div styleName='exportData'>
        <div styleName='exportDataLabel'>{messages.exportData}:</div>
        <button
          styleName='exportDataButton'
          onClick={onExportDataButtonClick}
          style={buttonStyle('red')}
        >
          {messages.exportDataButton}
        </button>
      </div>
      <div styleName='importData'>
        <div styleName='importDataLabel'>{messages.importData}:</div>
        <button
          styleName='importDataButton'
          onClick={onImportDataButtonClick}
          style={buttonStyle('red')}
        >
          {messages.importDataButton}
        </button>
      </div>
    </SettingPageTemplate>
  );
}
