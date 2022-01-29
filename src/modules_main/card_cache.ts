/**
 * TreeStickies
 * © 2022 Hidekazu Kubota
 */
import { ICard } from '../modules_common/types';

/**
 * cacheOfCard
 *
 * @remarks
 * - key: sketchUrl
 * - value: Card
 */
export const cacheOfCard: Map<string, ICard> = new Map<string, ICard>(); // means { [sketchUrl: string]: ICard] }
