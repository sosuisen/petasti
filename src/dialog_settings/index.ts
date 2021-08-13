/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { InfoState, SettingsState } from '../modules_common/store.types';
import { SettingsDialog, SettingsDialogProps } from './SettingsDialog';
import { settingsDialogStore } from './store';

// window.document.addEventListener('DOMContentLoaded', onready);

// eslint-disable-next-line complexity
window.addEventListener('message', event => {
  if (event.source !== window || !event.data.command) return;

  switch (event.data.command) {
    case 'initialize-store': {
      const info: InfoState = event.data.info;
      const settings: SettingsState = event.data.settings;

      settingsDialogStore.dispatch({
        type: 'info-init',
        payload: info,
      });

      settingsDialogStore.dispatch({
        type: 'settings-init',
        payload: settings,
      });

      const domContainer = document.getElementById('react-container');

      const props: SettingsDialogProps = {
        defaultSettingId: 'save',
        title: 'settingsDialog',
        menu: {
          items: [
            {
              id: 'save',
              label: 'settingPageSave',
              icon: 'fas fa-share-square',
              color: 'yellow',
              width: 450,
              height: 220,
            },
            {
              id: 'security',
              label: 'settingPageSync',
              icon: 'fas fa-shield-alt',
              color: 'purple',
              width: 350,
              height: 220,
            },
            {
              id: 'language',
              label: 'settingPageLanguage',
              icon: 'fas fa-globe',
              color: 'orange',
              width: 400,
              height: 220,
            },
            {
              id: 'about',
              label: 'settingPageAbout',
              icon: 'fas fa-info-circle',
              color: 'lightgray',
              width: 420,
              height: 220,
            },
          ],
        },
      };
      ReactDOM.render(React.createElement(SettingsDialog, props), domContainer);
      break;
    }
    case 'update-info': {
      const info: InfoState = event.data.info;
      settingsDialogStore.dispatch({
        type: 'info-init',
        payload: info,
      });
      break;
    }
    default:
      break;
  }
});
