/* eslint-disable dot-notation */
/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { Avatar } from '../modules_common/schema_avatar';
import { Card } from '../modules_common/schema_card';
import { CartaDocument } from '../modules_common/types';
import { Workspace } from '../modules_common/schema_workspace';
import { PersistentStoreAction } from '../modules_common/actions';
import { emitter } from './event';

type CartaTypes = Workspace | Avatar | Card;

/**
 * Get RxDB documents
 */
export const getDocsRx = async (
  collection: RxCollection,
  ids?: string[],
  sortFunc?: (a: any, b: any) => number
): Promise<RxDocument[]> => {
  try {
    return (ids === undefined
      ? await getAllDocsRx(collection)
      : await getSelectedDocsRx(collection, ids)
    ).sort(sortFunc ?? sortByCartaDate);
  } catch (e) {
    throw new Error(e);
  }
};

/**
 * Get plain objects
 */
export const getDocs = async <T extends CartaTypes>(
  collection: RxCollection,
  ids?: string[],
  sortFunc?: (a: any, b: any) => number
): Promise<T[]> => {
  try {
    return ((ids === undefined
      ? await getAllDocs(collection)
      : await getSelectedDocs(collection, ids)
    ).sort(sortFunc ?? sortByCartaDate) as unknown) as T[];
  } catch (e) {
    throw new Error(e);
  }
};

// ! Utils for get documents

const sortByCartaDate = function (a: any, b: any) {
  if (a.date.createdDate > b.date.createdDate) {
    return 1;
  }
  else if (a.date.createdDate < b.date.createdDate) {
    return -1;
  }
  return 0;
};

const getAllDocsRx = async (collection: RxCollection): Promise<RxDocument[]> => {
  return await collection
    .find()
    .exec()
    .catch(e => {
      throw new Error(e);
    });
};

const getSelectedDocsRx = async (
  collection: RxCollection,
  ids: string[]
): Promise<RxDocument[]> => {
  const cardDocsMap = (await collection.findByIds(ids).catch(e => {
    throw new Error(e);
  })) as Map<string, RxDocument>;
  return [...cardDocsMap.values()];
};

const getAllDocs = async (collection: RxCollection): Promise<CartaDocument[]> => {
  // dump() is faster than find() and toJSON()
  try {
    return ((await collection.dump()).docs as unknown) as CartaDocument[];
  } catch (e) {
    throw new Error(e);
  }
};

const getSelectedDocs = async (
  collection: RxCollection,
  ids: string[]
): Promise<CartaDocument[]> => {
  const cardDocsMap = (await collection.findByIds(ids).catch(e => {
    throw new Error(e);
  })) as Map<string, RxDocument>;
  return [...cardDocsMap.values()].map(doc => doc.toJSON()) as CartaDocument[];
};

export const persistentStoreActionDispatcher = (action: PersistentStoreAction) => {
  // emitter.emit calls listener synchronously
  emitter.emit('persistent-store-dispatch', action);
};
