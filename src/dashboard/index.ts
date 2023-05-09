/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { JsonDoc } from 'git-documentdb';
import { InfoState } from '../modules_common/store.types';
import { Dashboard, DashboardProps } from './Dashboard';
import { dashboardStore } from './store';
import { SearchResult } from '../modules_common/search.types';

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
              icon: 'fas fa-search',
              color: 'yellow',
              width: 450,
              height: 350,
            },
            {
              id: 'space',
              label: 'dashboardPageSpace',
              icon: 'fas fa-th',
              color: 'purple',
              width: 440,
              height: 370,
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
    case 'search-result-note-and-card': {
      const noteDocs = event.data.noteResults as JsonDoc[];
      const cardDocs = event.data.cardResults as JsonDoc[];
      const noteList = noteDocs.map(doc => {
        const label: SearchResult = { type: 'note', text: doc.name };
        return label;
      });
      const cardList = cardDocs.map(doc => {
        const label: SearchResult = {
          type: 'card',
          text: doc._body.substr(0, 70).replaceAll('&nbsp;', ' '),
        };
        return label;
      });

      dashboardStore.dispatch({
        type: 'search-result-show',
        payload: [...noteList, ...cardList],
      });

      break;
    }
    default:
      break;
  }
});
