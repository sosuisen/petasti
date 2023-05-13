import { getRandomInt } from '../modules_common/utils';
import { DashboardChangePageAction } from './dashboard_local.types';
import { dashboardStore } from './store';

const soundMap: { [key: string]: HTMLAudioElement } = {};

export const playAudio = (name: string) => {
  if (soundMap[name] === undefined) {
    soundMap[name] = document.getElementById(name) as HTMLAudioElement;
  }
  soundMap[name].play();
};

let currentAudio: HTMLAudioElement;
export const openAnotherTab = (pageName: string) => {
  // Play if page changes
  playAudio('soundEffect0' + getRandomInt(1, 4));
  const action: DashboardChangePageAction = {
    type: 'dashboard-change-page',
    payload: pageName,
  };
  dashboardStore.dispatch(action);
};
