/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { ICard } from '../modules_common/types';

/**
 * cacheOfCard
 *
 * @remarks
 * - key: cardUrl
 * - value: Card
 */
export const cacheOfCard: Map<string, ICard> = new Map<string, ICard>(); // means { [cardUrl: string]: ICard] }
