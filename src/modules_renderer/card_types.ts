import { CardBody, CardSketch, CardWorkState } from '../modules_common/types';

export type ChangeFrom = 'local' | 'remote';

export type CardState = {
  body: CardBody;
  sketch: CardSketch;
  workState: CardWorkState;
};
