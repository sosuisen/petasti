import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk from 'redux-thunk';
import {
  CARD_VERSION,
  DEFAULT_CARD_CONDITION,
  DEFAULT_CARD_GEOMETRY,
  DEFAULT_CARD_STYLE,
} from '../modules_common/const';
import { CardBody, CardSketch, CardWorkState } from '../modules_common/types';
import { CardBodyAction, CardSketchAction, CardWorkStateAction } from './card_action';

const cardBodyReducer = (
  // eslint-disable-next-line default-param-last
  state: CardBody = {
    version: CARD_VERSION,
    type: 'text/html',
    user: 'local',
    date: {
      createdDate: '',
      modifiedDate: '',
    },
    _body: '',
    _id: '',
  },
  action: CardBodyAction
) => {
  switch (action.type) {
    case 'card-body-init': {
      const newState = JSON.parse(JSON.stringify(action.payload));
      return newState;
    }
    case 'card-body-update': {
      const newState = JSON.parse(JSON.stringify(action.payload));
      return newState;
    }
    default:
      return state;
  }
};

const cardSketchReducer = (
  // eslint-disable-next-line default-param-last
  state: CardSketch = {
    geometry: DEFAULT_CARD_GEOMETRY,
    style: DEFAULT_CARD_STYLE,
    condition: DEFAULT_CARD_CONDITION,
    _id: '',
  },
  action: CardSketchAction
) => {
  switch (action.type) {
    case 'card-sketch-init': {
      const newState = JSON.parse(JSON.stringify(action.payload));
      return newState;
    }
    case 'card-sketch-update': {
      const newState = JSON.parse(JSON.stringify(action.payload));
      return newState;
    }
    case 'card-sketch-locked-update': {
      const newState = JSON.parse(JSON.stringify(action.payload)) as CardSketch;
      newState.condition.locked = action.payload;
      return newState;
    }
    default:
      return state;
  }
};

const cardWorkStateReducer = (
  // eslint-disable-next-line default-param-last
  state: CardWorkState = {
    url: '',
    status: 'Blurred',
  },
  action: CardWorkStateAction
) => {
  switch (action.type) {
    case 'card-work-state-status-update': {
      const newState = JSON.parse(JSON.stringify(state));
      newState.status = action.payload;
      return newState;
    }
    default:
      return state;
  }
};

export const cardReducer = combineReducers({
  body: cardBodyReducer,
  sketch: cardSketchReducer,
  workState: cardWorkStateReducer,
});

export const cardStore = createStore(cardReducer, applyMiddleware(thunk));
