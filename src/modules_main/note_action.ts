/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
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

export interface NoteModifiedDateUpdateAction {
  type: 'note-modified-date-update';
  payload: {
    id: string;
    modifiedDate: string;
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

export interface NoteUpdateResidentAction {
  type: 'note-resident-update';
  payload: string;
}

export interface NoteDeleteResidentAction {
  type: 'note-resident-delete';
}

export type NoteAction =
  | NoteInitAction
  | NoteCreateAction
  | NoteModifiedDateUpdateAction
  | NoteUpdateAction
  | NoteDeleteAction
  | NoteUpdateResidentAction
  | NoteDeleteResidentAction;
