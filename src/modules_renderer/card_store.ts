import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk, { ThunkDispatch, ThunkMiddleware } from 'redux-thunk';
import {
  CARD_VERSION,
  DEFAULT_CARD_CONDITION,
  DEFAULT_CARD_GEOMETRY,
  DEFAULT_CARD_LABEL,
  DEFAULT_CARD_STYLE,
} from '../modules_common/const';
import {
  CardBody,
  CardCondition,
  CardLabel,
  CardStyle,
  CardWorkState,
  CartaDate,
  Geometry,
} from '../modules_common/types';
import { getCurrentDateAndTime } from '../modules_common/utils';
import {
  CardAction,
  CardBodyAction,
  CardConditionAction,
  CardGeometryAction,
  CardLabelAction,
  CardSketchDateAction,
  CardSketchIdInitAction,
  CardStyleAction,
  CardWorkStateAction,
} from './card_action';
import { CardState } from './card_types';

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
    case 'card-body-body-update': {
      const newState = JSON.parse(JSON.stringify(state)) as CardBody;
      newState._body = action.payload;
      newState.date.modifiedDate = getCurrentDateAndTime();
      console.log('# cardBodyReducer: ' + JSON.stringify(newState));
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
    case 'card-geometry-init': {
      return { ...action.payload };
    }
    case 'card-geometry-update': {
      const newState = { ...action.payload };
      console.log('# cardGeometryReducer: ' + JSON.stringify(newState));
      return newState;
    }
    case 'card-geometry-z-update': {
      const newState = { ...state, z: action.payload };
      console.log('# cardGeometryReducer: ' + JSON.stringify(newState));
      return newState;
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
    case 'card-style-init': {
      return { ...action.payload };
    }
    case 'card-style-update': {
      const newState = { ...state, ...action.payload };
      console.log('# cardStyleReducer: ' + JSON.stringify(newState));
      return newState;
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
    case 'card-condition-init': {
      return { ...action.payload };
    }
    case 'card-condition-update': {
      const newState = { ...state, ...action.payload };
      console.log('# cardConditionReducer: ' + JSON.stringify(newState));
      return newState;
    }
    /*
    case 'card-condition-locked-update': {
      const newState = { ...state, locked: action.payload };
      console.log('# cardConditionReducer: ' + JSON.stringify(newState));
      return newState;
    }
    */
    default:
      return state;
  }
};

const cardLabelReducer = (
  // eslint-disable-next-line default-param-last
  state: CardLabel = DEFAULT_CARD_LABEL,
  action: CardLabelAction
) => {
  switch (action.type) {
    case 'card-label-init': {
      const newState = { ...action.payload };
      console.log('# cardLabelReducer: ' + JSON.stringify(newState));
      return newState;
    }
    case 'card-label-update': {
      const newState = { ...state, ...action.payload };
      console.log('# cardLabelReducer: ' + JSON.stringify(newState));
      return newState;
    }
    case 'card-label-rect-update': {
      const newState = {
        ...state,
        x: action.payload.x,
        y: action.payload.y,
        width: action.payload.width,
        height: action.payload.height,
      };
      console.log('# cardLabelReducer: ' + JSON.stringify(newState));
      return newState;
    }
    default:
      return state;
  }
};

const cardSketchDateReducer = (
  // eslint-disable-next-line default-param-last
  state: CartaDate = {
    modifiedDate: '',
    createdDate: '',
  },
  action: CardSketchDateAction
) => {
  switch (action.type) {
    case 'card-sketch-date-init': {
      return { ...action.payload };
    }
    case 'card-sketch-date-update': {
      return { ...state, ...action.payload };
    }
    case 'card-sketch-modified-date-update': {
      console.log('# cardSketchDateReducer: ' + action.payload);
      return { ...state, modifiedDate: action.payload };
    }
    default:
      return state;
  }
};

const cardSketchIdReducer = (
  // eslint-disable-next-line default-param-last
  state = '',
  action: CardSketchIdInitAction
) => {
  switch (action.type) {
    case 'card-sketch-id-init': {
      return action.payload;
    }
    default:
      return state;
  }
};

export const cardSketchReducer = combineReducers({
  geometry: cardGeometryReducer,
  style: cardStyleReducer,
  condition: cardConditionReducer,
  label: cardLabelReducer,
  date: cardSketchDateReducer,
  _id: cardSketchIdReducer,
});

const cardWorkStateReducer = (
  // eslint-disable-next-line default-param-last
  state: CardWorkState = {
    url: '',
    status: 'Blurred',
  },
  action: CardWorkStateAction
) => {
  switch (action.type) {
    case 'card-work-state-init': {
      console.log('# cardWorkStateReducer: ' + JSON.stringify(action.payload));
      return { ...action.payload };
    }
    case 'card-work-state-status-update': {
      console.log('# cardWorkStateReducer: ' + action.payload);
      return { ...state, status: action.payload };
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

type IAppDispatch = ThunkDispatch<CardState, any, CardAction>;

export const cardStore = createStore(
  cardReducer,
  applyMiddleware<IAppDispatch, any>(thunk as ThunkMiddleware<CardState, CardAction, any>)
);
