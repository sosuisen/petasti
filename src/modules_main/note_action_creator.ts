/**
 * TreeStickies
 * © 2022 Hidekazu Kubota
 */
import AsyncLock from 'async-lock';
import { Dispatch } from 'redux';
import { NoteProp, ZOrder } from '../modules_common/types';
import {
  NoteCreateAction,
  NoteDeleteAction,
  NoteInitAction,
  NoteUpdateAction,
  NoteZOrderUpdateAction,
} from './note_action';
import { INote, NoteState } from './note_types';

type ChangeFrom = 'local' | 'remote';

const lock = new AsyncLock();

let prevZOrder: ZOrder;

export const setInitialZOrder = (zOrder: ZOrder) => {
  prevZOrder = zOrder;
};

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

export const noteZOrderUpdateCreator = (
  note: INote,
  noteId: string,
  zOrder: string[],
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => NoteState) {
    await lock.acquire('noteUpdate', async () => {
      if (enqueueTime !== undefined) {
        const updatedTime = getState().get(noteId)?.updatedTime;
        if (updatedTime !== undefined && updatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }
      const noteAction: NoteZOrderUpdateAction = {
        type: 'note-z-order-update',
        payload: {
          id: noteId,
          zOrder,
        },
      };
      dispatch(noteAction);

      if (JSON.stringify(prevZOrder) !== JSON.stringify(zOrder)) {
        if (changeFrom === 'local') {
          const newProp = getState().get(noteId);
          if (newProp) {
            const taskMetadata = await note.updateNoteDoc(newProp);
            // eslint-disable-next-line require-atomic-updates
            newProp.updatedTime = taskMetadata.enqueueTime;
          }
        }
      }
      // eslint-disable-next-line require-atomic-updates
      prevZOrder = zOrder;
    });
  };
};

export const noteUpdateCreator = (
  note: INote,
  noteProp: NoteProp,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => NoteState) {
    await lock.acquire('noteUpdate', async () => {
      if (enqueueTime !== undefined) {
        const updatedTime = getState().get(noteProp._id)?.updatedTime;
        if (updatedTime !== undefined && updatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }
      const noteAction: NoteUpdateAction = {
        type: 'note-update',
        payload: noteProp,
      };
      dispatch(noteAction);
      if (changeFrom === 'local') {
        const newProp = getState().get(noteProp._id);
        if (newProp) {
          const taskMetadata = await note.updateNoteDoc(newProp);
          // eslint-disable-next-line require-atomic-updates
          newProp.updatedTime = taskMetadata.enqueueTime;
        }
      }
    });
  };
};

export const noteDeleteCreator = (
  note: INote,
  noteId: string,
  changeFrom: ChangeFrom = 'local',
  enqueueTime: string | undefined = undefined
) => {
  return async function (dispatch: Dispatch<any>, getState: () => NoteState) {
    await lock.acquire('noteDelete', async () => {
      const noteProp = getState().get(noteId);
      if (noteProp === undefined) {
        return;
      }
      if (enqueueTime !== undefined) {
        const updatedTime = noteProp?.updatedTime;
        if (updatedTime !== undefined && updatedTime! > enqueueTime) {
          console.log('Block expired remote update');
          return;
        }
      }
      const noteAction: NoteDeleteAction = {
        type: 'note-delete',
        payload: noteId,
      };
      dispatch(noteAction);
      if (changeFrom === 'local') {
        await note.deleteNoteDoc(noteId);
      }
    });
  };
};
