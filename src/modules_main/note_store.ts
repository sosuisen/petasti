/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { applyMiddleware, createStore } from 'redux';
import thunk, { ThunkDispatch, ThunkMiddleware } from 'redux-thunk';
import { NoteAction } from './note_action';
import { NoteState } from './note_types';

const noteReducer = (
  // eslint-disable-next-line default-param-last
  state: NoteState = {
    noteMap: new Map(),
    residentNoteId: '',
  },
  action: NoteAction
) => {
  switch (action.type) {
    case 'note-init': {
      const newState = {
        noteMap: new Map(action.payload.noteMap),
        residentNoteId: action.payload.residentNoteId,
      };
      return newState;
    }
    case 'note-create': {
      const newState = new Map(state.noteMap);
      newState.set(action.payload._id, action.payload);
      return {
        noteMap: newState,
        residentNoteId: state.residentNoteId,
      };
    }
    case 'note-modified-date-update': {
      const newState = new Map(state.noteMap);
      newState.get(action.payload.id)!.date.modifiedDate = action.payload.modifiedDate;
      return {
        noteMap: newState,
        residentNoteId: state.residentNoteId,
      };
    }
    case 'note-update': {
      const newState = new Map(state.noteMap);
      newState.set(action.payload._id, action.payload);
      return {
        noteMap: newState,
        residentNoteId: state.residentNoteId,
      };
    }
    case 'note-delete': {
      const newState = new Map(state.noteMap);
      newState.delete(action.payload);
      return {
        noteMap: newState,
        residentNoteId: state.residentNoteId,
      };
    }
    case 'note-resident-update': {
      const newState = new Map(state.noteMap);
      return {
        noteMap: newState,
        residentNoteId: action.payload,
      };
    }
    case 'note-resident-delete': {
      const newState = new Map(state.noteMap);
      return {
        noteMap: newState,
        residentNoteId: '',
      };
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
