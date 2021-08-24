/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { ICard } from '../modules_common/types';

/**
 * currentCardMap
 *
 * @remarks
 * - key: cardUrl
 * - value: Card
 */
export const currentCardMap: Map<string, ICard> = new Map(); // means { [cardUrl: string]: ICard] }
