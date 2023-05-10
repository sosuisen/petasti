import { getRandomInt } from '../modules_common/utils';
import { DashboardChangePageAction } from './dashboard_local.types';
import { dashboardStore } from './store';

let currentAudio: HTMLAudioElement;
export const openAnotherTab = (pageName: string) => {
  // Play if page changes
  if (currentAudio !== undefined) {
    currentAudio.pause();
  }
  currentAudio = document.getElementById(
    'soundEffect0' + getRandomInt(1, 4)
  ) as HTMLAudioElement;
  currentAudio.play();

  const action: DashboardChangePageAction = {
    type: 'dashboard-change-page',
    payload: pageName,
  };
  dashboardStore.dispatch(action);
};
