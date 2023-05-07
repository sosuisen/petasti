/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { DashboardState, InfoState } from '../modules_common/store.types';
import { Dashboard, DashboardProps } from './Dashboard';
import { dashboardStore } from './store';

// window.document.addEventListener('DOMContentLoaded', onready);

// eslint-disable-next-line complexity
window.addEventListener('message', event => {
  if (event.source !== window || !event.data.command) return;

  switch (event.data.command) {
    case 'initialize-store': {
      const info: InfoState = event.data.info;

      dashboardStore.dispatch({
        type: 'info-init',
        payload: info,
      });

      const domContainer = document.getElementById('react-container');

      const props: DashboardProps = {
        defaultSettingId: 'search',
        title: 'dashboard',
        menu: {
          items: [
            {
              id: 'search',
              label: 'dashboardPageSearch',
              icon: 'fas fa-share-square',
              color: 'yellow',
              width: 450,
              height: 270,
            },
            {
              id: 'space',
              label: 'dashboardPageSpace',
              icon: 'fas fa-shield-alt',
              color: 'purple',
              width: 350,
              height: 270,
            } /*,
            {
              id: 'card',
              label: 'dashboardPageCard',
              icon: 'fas fa-globe',
              color: 'orange',
              width: 400,
              height: 270,
            },
            {
              id: 'snapshot',
              label: 'dashboardPageSnapshot',
              icon: 'fas fa-info-circle',
              color: 'lightgray',
              width: 420,
              height: 270,
            },
            */,
          ],
        },
      };
      ReactDOM.render(React.createElement(Dashboard, props), domContainer);
      break;
    }
    default:
      break;
  }
});
