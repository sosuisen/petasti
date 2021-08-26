/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import AsyncLock from 'async-lock';
import { Dispatch } from 'redux';
import { NoteProp } from '../modules_common/types';
import {
  NoteCreateAction,
  NoteDeleteAction,
  NoteInitAction,
  NoteUpdateAction,
} from './note_action';
import { INote, NoteState } from './note_types';

type ChangeFrom = 'local' | 'remote';

const lock = new AsyncLock();

export const noteInitCreator = (noteState: NoteState) => {
  const noteAction: NoteInitAction = {
    type: 'note-init',
    payload: noteState,
  };
  return noteAction;
};

export const noteCreateCreator = (
  note: INote,
  noteProp: NoteProp,
  changeFrom: ChangeFrom = 'local'
) => {
  return async function (dispatch: Dispatch<any>, getState: () => NoteState) {
    if (changeFrom === 'local') await note.updateNoteDoc(noteProp);
    const noteAction: NoteCreateAction = {
      type: 'note-create',
      payload: noteProp,
    };
    dispatch(noteAction);
  };
};

export const noteUpdateCreator = (
  note: INote,
  noteProp: NoteProp,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => NoteState) {
    await lock.acquire('noteUpdate', async () => {
      if (
        enqueueTime !== undefined &&
        getState().get(noteProp._id).updatedTime !== undefined &&
        getState().get(noteProp._id).updatedTime > enqueueTime
      ) {
        console.log('Block expired remote update');
        return;
      }
      if (changeFrom === 'local') {
        const taskMetadata = await note.updateNoteDoc(noteProp);
        // eslint-disable-next-line require-atomic-updates
        noteProp.updatedTime = taskMetadata.enqueueTime;
      }
      const noteAction: NoteUpdateAction = {
        type: 'note-update',
        payload: noteProp,
      };
      dispatch(noteAction);
    });
  };
};

export const noteDeleteCreator = (
  note: INote,
  noteId: string,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => NoteState) {
    await lock.acquire('noteDelete', async () => {
      if (
        enqueueTime !== undefined &&
        getState().get(noteId).updatedTime !== undefined &&
        getState().get(noteId).updatedTime > enqueueTime
      ) {
        console.log('Block expired remote update');
        return;
      }
      if (changeFrom === 'local') {
        const taskMetadata = await note.deleteNoteDoc(noteId);
      }
      const noteAction: NoteDeleteAction = {
        type: 'note-delete',
        payload: noteId,
      };
      dispatch(noteAction);
    });
  };
};
