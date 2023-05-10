import { useContext } from 'react';
import { getRandomInt } from '../modules_common/utils';
import { LocalAction, localContext, LocalProvider } from './store_local';

let currentAudio: HTMLAudioElement;
export const openAnotherTab = (dispatch: React.Dispatch<LocalAction>, pageName: string) => {
  // Play if page changes
  if (currentAudio !== undefined) {
    currentAudio.pause();
  }
  currentAudio = document.getElementById(
    'soundEffect0' + getRandomInt(1, 4)
  ) as HTMLAudioElement;
  currentAudio.play();

  const action: LocalAction = {
    type: 'UpdateActiveSetting',
    activeDashboardId: pageName,
  };
  dispatch(action);
};
