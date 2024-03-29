/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { applyMiddleware, createStore } from 'redux';
import thunk, { ThunkDispatch, ThunkMiddleware } from 'redux-thunk';
import { NoteAction } from './note_action';
import { NoteState } from './note_types';

const noteReducer = (
  // eslint-disable-next-line default-param-last
  state: NoteState = new Map(),
  action: NoteAction
) => {
  switch (action.type) {
    case 'note-init': {
      const newState = new Map(action.payload);
      return newState;
    }
    case 'note-create': {
      const newState = new Map(state);
      newState.set(action.payload._id, action.payload);
      return newState;
    }
    case 'note-z-order-update': {
      const newState = new Map(state);
      newState.get(action.payload.id)!.zOrder = [...action.payload.zOrder];
      return newState;
    }
    case 'note-update': {
      const newState = new Map(state);
      newState.set(action.payload._id, action.payload);
      return newState;
    }
    case 'note-delete': {
      const newState = new Map(state);
      newState.delete(action.payload);
      return newState;
    }
    default:
      return state;
  }
};
type IAppDispatch = ThunkDispatch<NoteState, any, NoteAction>;
export const noteStore = createStore(
  noteReducer,
  applyMiddleware<IAppDispatch, any>(thunk as ThunkMiddleware<NoteState, NoteAction, any>)
);
