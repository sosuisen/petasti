import path from 'path';
import { app } from 'electron';
import { getRandomInt } from '../modules_common/utils';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const player = require('node-wav-player');

export const soundDir = app.isPackaged
  ? path.join(__dirname, `../../../../../../dist/sound/`)
  : path.join(__dirname, `../../dist/sound/`);

export const playSound = (soundName: string, maxInt = 1, async = false) => {
  const rand = getRandomInt(1, maxInt + 1);
  if (async) {
    setTimeout(() => {
      player
        .play({
          path: soundDir + soundName + rand + '.wav',
        })
        .then(() => {
          console.log('The wav file started to be played successfully.');
        })
        .catch((error: any) => {
          console.error(error);
        });
    }, 1);
  }
  else {
    player
      .play({
        path: soundDir + soundName,
      })
      .then(() => {
        console.log('The wav file started to be played successfully.');
      })
      .catch((error: any) => {
        console.error(error);
      });
  }
};
