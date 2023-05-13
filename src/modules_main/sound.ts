import { getRandomInt } from '../modules_common/utils';
import { defaultSoundDir } from '../modules_common/store.types';
import { dashboard } from './dashboard';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const player = require('node-wav-player');

/* Don't work
import Speaker from 'speaker'; 
import { StreamAudioContext as AudioContext } from '@descript/web-audio-js';

const play = (path: string) => {
  const buf = fs.readFileSync(path);
  const context = new AudioContext();

  context
    .decodeAudioData(buf.buffer)
    .then(audioBuffer => {
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = false;
      //      source.loopStart = 0;
      //      source.loopEnd = audioBuffer.duration;
      source.playbackRate.value = 1.0;
      source.connect(context.destination, 0, 0);
      context.pipe(new Speaker());
      context.resume();
    })
    .catch(() => {});
};
*/

/*
 * [カードの移動・分身。ばしゅっ系]
move1.wav
 https://dova-s.jp/se/play130.html
 基本形。ばしゅーっ。
move2.wav
 https://dova-s.jp/se/play543.html
 瞬間移動。ぴしゅっ。
move3.wav
 https://dova-s.jp/se/play976.html
 チップチューン。ぴーりゅりゅりゅ。

https://dova-s.jp/se/play872.html
ごーーひゅーー。
https://dova-s.jp/se/play1396.html
ぴゅん。

 * [新規作成・切り出し。ぴこん系]
create1.wav
 https://dova-s.jp/se/play371.html
 ぴこん
create2.wav
 https://dova-s.jp/se/play858.html
 ぴほーはー

 create3.wav
 https://dova-s.jp/se/play1289.html
 ぴこりこん
create4.wav
 https://dova-s.jp/se/play1305.html
 ぴよっ
create5.wav
 https://dova-s.jp/se/play580.html
 ぽろろろりん

https://dova-s.jp/se/play1052.html
 ぴょおおおん
https://dova-s.jp/se/play1341.html
 ぴん
https://dova-s.jp/se/play1057.html
ぴーん
https://dova-s.jp/se/play1047.html
しゃん
https://dova-s.jp/se/play670.html
ぴん

* [アーカイブ。一拍おいて、落下系]
drop1.wav
 https://dova-s.jp/se/play227.html
 どさっ（トラック２）
drop2.wav
 https://dova-s.jp/se/play1327.html
 どどん
drop3.wav
 https://dova-s.jp/se/play1329.html
 こん。ちょっと間抜け。

* [削除。がさがさ、ほうりなげ系]
delete1.wav
 https://dova-s.jp/se/play1152.html
 がさっ
delete2.wav
 https://dova-s.jp/se/play850.html
 空き缶
delete3.wav
 https://dova-s.jp/se/play320.html
 ぴゅおん（ぽい捨て）

https://dova-s.jp/se/play194.html
がさがさっ
*/

export const soundFiles: { [key: string]: string } = {
  move1: 'move1.wav',
  move2: 'move2.wav',
  move3: 'move3.wav',
  create1: 'create1.wav',
  create2: 'create2.wav',
  create3: 'create3.wav',
  create4: 'create4.wav',
  create5: 'create5.wav',
  drop1: 'drop1.wav',
  drop2: 'drop2.wav',
  drop3: 'drop3.wav',
  delete1: 'delete1.wav',
  delete2: 'delete2.wav',
  delete3: 'delete3.wav',
};

export const playSound = (soundName: string, maxInt = 1) => {
  const rand = getRandomInt(1, maxInt + 1);

  dashboard.webContents.send('playaudio', soundName + rand);

  // play(defaultSoundDir + soundFiles[soundName + rand]);
  /*
  player
    .play({
      path: defaultSoundDir + soundFiles[soundName + rand],
    })
    .then(() => {
      console.log('The wav file started to be played successfully.');
    })
    .catch((error: any) => {
      console.error(error);
    });
  } */
};
