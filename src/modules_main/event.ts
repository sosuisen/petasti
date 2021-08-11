/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { EventEmitter } from 'events';

export const emitter = new EventEmitter();

// Register channel name of eventListener to remove it later.
export const handlers: string[] = [];
