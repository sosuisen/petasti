import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk from 'redux-thunk';
import {
  CARD_VERSION,
  DEFAULT_CARD_CONDITION,
  DEFAULT_CARD_GEOMETRY,
  DEFAULT_CARD_STYLE,
} from '../modules_common/const';
import {
  CardBody,
  CardCondition,
  CardStyle,
  CardWorkState,
  Geometry,
} from '../modules_common/types';
import {
  CardBodyAction,
  CardConditionAction,
  CardGeometryAction,
  CardStyleAction,
  CardWorkStateAction,
} from './card_action';

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
    case 'card-body-update': {
      const newState = JSON.parse(JSON.stringify(action.payload));
      return newState;
    }
    default:
      return state;
  }
};

const cardGeometryReducer = (
  // eslint-disable-next-line default-param-last
  state: Geometry = DEFAULT_CARD_GEOMETRY,
  action: CardGeometryAction
) => {
  switch (action.type) {
    case 'card-geometry-update': {
      return { ...state, ...action.payload };
    }
    case 'card-geometry-z-update': {
      return { ...state, z: action.payload };
    }
    default:
      return state;
  }
};

const cardStyleReducer = (
  // eslint-disable-next-line default-param-last
  state: CardStyle = DEFAULT_CARD_STYLE,
  action: CardStyleAction
) => {
  switch (action.type) {
    case 'card-style-update': {
      return { ...state, ...action.payload };
    }
    default:
      return state;
  }
};

const cardConditionReducer = (
  // eslint-disable-next-line default-param-last
  state: CardCondition = DEFAULT_CARD_CONDITION,
  action: CardConditionAction
) => {
  switch (action.type) {
    case 'card-condition-update': {
      return { ...state, ...action.payload };
    }
    case 'card-condition-locked-update': {
      return { ...state, locked: action.payload };
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
      return { ...state, status: action.payload };
    }
    default:
      return state;
  }
};

export const cardReducer = combineReducers({
  body: cardBodyReducer,
  geometry: cardGeometryReducer,
  style: cardStyleReducer,
  condition: cardConditionReducer,
  workState: cardWorkStateReducer,
});

export const cardStore = createStore(cardReducer, applyMiddleware(thunk));
