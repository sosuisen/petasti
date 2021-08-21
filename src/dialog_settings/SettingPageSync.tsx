/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import './SettingPageSync.css';
import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import {
  settingsSyncEnableUpdateCreator,
  settingsSyncIntervalUpdateCreator,
  settingsSyncPersonalAccessTokenUpdateCreator,
  settingsSyncRemoteUrlUpdateCreator,
} from './action_creator';
import { MenuItemProps } from './MenuItem';
import { SettingPageTemplate } from './SettingPageTemplate';
import { selectorMessages, selectorSettings } from './selector';

import window from './window';
import { ColorName, uiColors } from '../modules_common/color';
import { Toggle } from './Toggle';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const styles = require('./SettingPageSync.css');

export interface SettingPageSecurityProps {
  item: MenuItemProps;
  index: number;
}

export function SettingPageSync (props: SettingPageSecurityProps) {
  const dispatch = useDispatch();

  const messages = useSelector(selectorMessages);
  const settings = useSelector(selectorSettings);

  const [syncEnabledValue, setSyncEnabledValue] = useState(settings.sync.enabled);
  const [syncRemoteUrlValue, setSyncRemoteUrlValue] = useState(settings.sync.remoteUrl);
  const [syncPersonalAccessTokenValue, setSyncPersonalAccessTokenValue] = useState(
    settings.sync.connection.personalAccessToken
  );
  const [syncIntervalValue, setSyncIntervalValue] = useState(settings.sync.interval / 1000);
  const [syncIntervalAlertValue, setSyncIntervalAlertValue] = useState('');
  const [isTestSyncDialogOpen, setIsTestSyncDialogOpen] = useState(false);
  const [testSyncDialogMessage, setTestSyncDialogMessage] = useState(messages.testingSync);

  const saveSyncSettings = async () => {
    if (syncIntervalAlertValue !== '') {
      return;
    }
    if (syncRemoteUrlValue === '') {
      // nop
    }
    else if (
      syncRemoteUrlValue !== settings.sync.remoteUrl ||
      syncPersonalAccessTokenValue !== settings.sync.connection.personalAccessToken
    ) {
      if (syncRemoteUrlValue !== settings.sync.remoteUrl) {
        dispatch(settingsSyncRemoteUrlUpdateCreator(syncRemoteUrlValue));
      }
      if (syncPersonalAccessTokenValue !== settings.sync.connection.personalAccessToken) {
        dispatch(
          settingsSyncPersonalAccessTokenUpdateCreator(syncPersonalAccessTokenValue)
        );
      }

      // Test sync
      setTestSyncDialogMessage(messages.testingSync);
      setIsTestSyncDialogOpen(true);

      const result = await window.api
        .db({
          command: 'db-test-sync',
        })
        .catch(e => {
          return e;
        });
      if (result !== 'succeed') {
        console.log(result);
        setTestSyncDialogMessage(messages.syncError);
        return;
      }
      // Success
      setTestSyncDialogMessage('');
      setIsTestSyncDialogOpen(false);
      dispatch(settingsSyncEnableUpdateCreator(syncEnabledValue));
    }
    window.api.db({
      command: 'db-resume-sync',
    });
  };

  const changeSyncInterval = () => {
    if (syncIntervalValue < 10) {
      setSyncIntervalAlertValue(messages.syncIntervalAlert);
    }
    else {
      setSyncIntervalAlertValue('');
      dispatch(settingsSyncIntervalUpdateCreator(syncIntervalValue));
    }
  };

  const toggleOnChange = (syncEnable: boolean) => {
    setSyncEnabledValue(syncEnable);
  };

  const buttonStyle = (color: ColorName) => ({
    backgroundColor: uiColors[color],
    color: syncEnabledValue ? '#000000' : '#606060',
    boxShadow: syncEnabledValue ? styles.saveSyncSettingsButton.boxShadow : 'none',
    cursor: syncEnabledValue ? 'pointer' : 'auto',
  });

  return (
    <SettingPageTemplate item={props.item} index={props.index}>
      <dialog id='testSyncDialog' styleName='testSyncDialog' open={isTestSyncDialogOpen}>
        <div
          styleName='testSyncDialogCloseButton'
          onClick={e => setIsTestSyncDialogOpen(false)}
        >
          <i className='far fa-times-circle'></i>
        </div>
        <div styleName='testSyncDialogMessage'>{testSyncDialogMessage}</div>
      </dialog>
      <div styleName='syncToggleButton'>
        <Toggle
          color={uiColors.yellow}
          activeColor={uiColors.green}
          checked={syncEnabledValue}
          onChange={bool => toggleOnChange(bool)}
        />
      </div>
      <div styleName='syncToggleLabel'>{syncEnabledValue ? 'On' : 'Off'}</div>
      <button
        styleName='saveSyncSettingsButton'
        onClick={saveSyncSettings}
        style={buttonStyle('yellow')}
        disabled={!syncEnabledValue}
      >
        {messages.saveSyncSettingsButton}
      </button>

      <div
        styleName='syncSettings'
        style={{ color: syncEnabledValue ? '#000000' : '#606060' }}
      >
        <div styleName='syncRemoteUrl'>
          <div styleName='syncRemoteUrlHeader'>{messages.syncRemoteUrlHeader}</div>
          <input
            disabled={!syncEnabledValue}
            type='text'
            id='syncRemoteUrlInput'
            styleName='syncRemoteUrlInput'
            value={syncRemoteUrlValue}
            placeholder={messages.syncRemoteUrlPlaceholder}
            onChange={e => setSyncRemoteUrlValue(e.target.value)}
          ></input>
          <div styleName='syncRemoteUrlAlert'></div>
          <div styleName='syncRemoteUrlFooter'>{messages.syncRemoteUrlFooter}</div>
        </div>
        <div styleName='syncPersonalAccessToken'>
          <div styleName='syncPersonalAccessTokenHeader'>
            {messages.syncPersonalAccessTokenHeader}
          </div>
          <input
            disabled={!syncEnabledValue}
            type='text'
            id='syncPersonalAccessTokenInput'
            styleName='syncPersonalAccessTokenInput'
            value={syncPersonalAccessTokenValue}
            placeholder={messages.syncPersonalAccessTokenPlaceholder}
            onChange={e => setSyncPersonalAccessTokenValue(e.target.value)}
          ></input>
          <div styleName='syncPersonalAccessTokenAlert'></div>
          <div
            styleName='syncPersonalAccessTokenFooter'
            // eslint-disable-next-line @typescript-eslint/naming-convention
            dangerouslySetInnerHTML={{ __html: messages.syncPersonalAccessTokenFooter }}
          ></div>
        </div>
        <div styleName='syncInterval'>
          <div styleName='syncIntervalHeader'>{messages.syncIntervalHeader}</div>
          <input
            disabled={!syncEnabledValue}
            type='number'
            id='syncIntervalInput'
            styleName='syncIntervalInput'
            value={syncIntervalValue}
            onChange={e => setSyncIntervalValue(parseInt(e.target.value, 10))}
            onBlur={changeSyncInterval}
          ></input>
          <div styleName='syncIntervalFooter'>{messages.syncIntervalFooter}</div>
          <div styleName='syncIntervalAlert'>{syncIntervalAlertValue}</div>
        </div>
      </div>
    </SettingPageTemplate>
  );
}
