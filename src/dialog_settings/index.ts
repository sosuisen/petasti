/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { SettingsDialog, SettingsDialogProps } from './SettingsDialog';

const onready = () => {
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
};

window.document.addEventListener('DOMContentLoaded', onready);
