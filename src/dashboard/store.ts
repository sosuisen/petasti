/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk, { ThunkDispatch, ThunkMiddleware } from 'redux-thunk';
import { DashboardState, InfoState } from '../modules_common/store.types';
import { DashboardAction, InfoAction } from './action';
import { ENGLISH } from '../modules_common/i18n';

const infoReducer = (
  // eslint-disable-next-line default-param-last
  state: InfoState = {
    messages: ENGLISH,
    appinfo: {
      name: '',
      version: '',
      iconDataURL: '',
    },
  },
  action: InfoAction
) => {
  switch (action.type) {
    case 'info-init':
      return JSON.parse(JSON.stringify(action.payload));
    default:
      return state;
  }
};

export const dashboardReducer = combineReducers({
  info: infoReducer,
});

type IAppDispatch = ThunkDispatch<DashboardState, any, DashboardAction>;

export const dashboardStore = createStore(
  dashboardReducer,
  applyMiddleware<IAppDispatch, any>(
    thunk as ThunkMiddleware<IAppDispatch, DashboardAction, any>
  )
);
