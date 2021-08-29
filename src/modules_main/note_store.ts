/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';
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
    case 'note-modified-date-update': {
      const newState = new Map(state);
      newState.get(action.payload.id)!.date.modifiedDate = action.payload.modifiedDate;
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

export const noteStore = createStore(noteReducer, applyMiddleware(thunk));
