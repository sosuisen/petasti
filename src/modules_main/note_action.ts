import { NoteProp } from '../modules_common/types';

export interface NoteCreateAction {
  type: 'note-create';
  payload: NoteProp;
}

export interface NoteUpdateAction {
  type: 'note-update';
  payload: NoteProp;
}

export interface NoteDeleteAction {
  type: 'note-delete';
  payload: string; // NoteProp._id
}

export type NoteAction = NoteCreateAction | NoteUpdateAction | NoteDeleteAction;
