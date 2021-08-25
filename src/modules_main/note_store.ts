import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';
import { NoteProp } from '../modules_common/types';
import { NoteAction } from './note_action';

const noteReducer = (
  // eslint-disable-next-line default-param-last
  state: Map<string, NoteProp> = new Map(),
  action: NoteAction
) => {
  switch (action.type) {
    case 'note-create': {
      const newState = new Map(state);
      newState.set(action.payload._id, action.payload);
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
