/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { Dispatch } from 'redux';
import { NoteProp } from '../modules_common/types';
import { NoteCreateAction, NoteInitAction } from './note_action';
import { INote, NoteState } from './note_types';

type ChangeFrom = 'local' | 'remote';

export const noteInitCreator = (noteState: NoteState) => {
  const noteAction: NoteInitAction = {
    type: 'note-init',
    payload: noteState,
  };
  return noteAction;
};

export const noteCreateCreator = (note: INote, noteProp: NoteProp) => {
  return async function (
    dispatch: Dispatch<any>,
    getState: () => NoteState,
    enqueueTime?: string,
    changeFrom: ChangeFrom = 'local'
  ) {
    await note.updateNoteDoc(noteProp);
    const noteAction: NoteCreateAction = {
      type: 'note-create',
      payload: noteProp,
    };
    dispatch(noteAction);
  };
};
