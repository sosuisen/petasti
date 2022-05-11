/**
 * TreeStickies
 * © 2022 Hidekazu Kubota
 */
import { NoteProp } from '../modules_common/types';
import { NoteState } from './note_types';

export interface NoteInitAction {
  type: 'note-init';
  payload: NoteState;
}

export interface NoteCreateAction {
  type: 'note-create';
  payload: NoteProp;
}

export interface NoteZOrderUpdateAction {
  type: 'note-z-order-update';
  payload: {
    id: string;
    zOrder: string[];
  };
}

export interface NoteUpdateAction {
  type: 'note-update';
  payload: NoteProp;
}

export interface NoteDeleteAction {
  type: 'note-delete';
  payload: string; // NoteProp._id
}

export type NoteAction =
  | NoteInitAction
  | NoteCreateAction
  | NoteZOrderUpdateAction
  | NoteUpdateAction
  | NoteDeleteAction;
