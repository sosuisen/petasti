/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { CardPropStatus, SavingTarget, Task } from '../modules_common/types';
import { setTitleMessage } from './card_renderer';
import { getCurrentDateAndTime } from '../modules_common/utils';
import { DIALOG_BUTTON } from '../modules_common/const';
import window from './window';

let unfinishedTasks: Task[] = [];

export const waitUnfinishedTasks = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (unfinishedTasks.length > 0) {
      let timeoutCounter = 0;
      const checker = async () => {
        if (unfinishedTasks.length === 0) {
          resolve();
        }
        else if (timeoutCounter >= 10) {
          await window.api
            .confirmDialog(id, ['btnOK', 'btnCancel'], 'confirmWaitMore')
            .then((res: number) => {
              if (res === DIALOG_BUTTON.default) {
                // OK
                timeoutCounter = 0;
              }
              else if (res === DIALOG_BUTTON.cancel) {
                // Cancel
                reject(new Error('Canceled by user'));
              }
              else if (res === DIALOG_BUTTON.error) {
                console.error('Error in confirm-dialog');
              }
            })
            .catch(() => {});
        }
        timeoutCounter++;
        setTimeout(checker, 500);
      };
      setTimeout(checker, 500);
    }
    else {
      resolve();
    }
  });
};

const execTask = async () => {
  if (unfinishedTasks.length === 1) {
    const task = unfinishedTasks[0];
    const timeout = setTimeout(() => {
      if (task.type === 'Save') {
        setTitleMessage('[saving...]');
      }
      else if (task.type === 'DeleteCard' || task.type === 'DeleteCard') {
        setTitleMessage('[deleting...]');
      }
    }, 1000);

    // Execute the first task
    if (task.type === 'Save') {
      await window.api.updateCard(task.prop, task.target!).catch(e => {
        // TODO: Handle save error.
        console.error('Error in execTask:' + e);
      });
    }
    else if (task.type === 'DeleteCard') {
      await window.api.deleteCard(task.prop.url).catch(e => {
        // TODO: Handle save error.
        console.error('Error in execTask:' + e);
      });
    }
    else if (task.type === 'DeleteCard') {
      await window.api.deleteCard(task.prop.url).catch(e => {
        // TODO: Handle save error.
        console.error('Error in execTask:' + e);
      });
    }

    const finishedTask = unfinishedTasks.shift();
    console.debug(
      `Dequeue unfinishedTask: [${finishedTask?.type}: ${finishedTask?.target}] ${finishedTask?.prop.date.modifiedDate}`
    );
    clearTimeout(timeout);
    setTitleMessage('');
    if (unfinishedTasks.length > 0) {
      execTask();
    }
  }
};

export const saveCardColor = (
  cardPropStatus: CardPropStatus,
  bgColor: string,
  uiColor?: string,
  opacity = 1.0
) => {
  if (uiColor === undefined) {
    uiColor = bgColor;
  }
  cardPropStatus.style.backgroundColor = bgColor;
  cardPropStatus.style.uiColor = uiColor;
  cardPropStatus.style.opacity = opacity;

  saveCard(cardPropStatus, 'PropertyOnly');
};

export const deleteCard = (cardPropStatus: CardPropStatus) => {
  cardPropStatus.date.modifiedDate = getCurrentDateAndTime();
  while (unfinishedTasks.length > 1) {
    const poppedTask = unfinishedTasks.pop();
    console.debug(
      `Skip unfinishedTask: [${poppedTask?.type}] ${poppedTask?.prop.date.modifiedDate}`
    );
  }
  console.debug(
    `Enqueue unfinishedTask: [Delete Card] ${cardPropStatus.date.modifiedDate}`
  );
  // Here, current length of unfinishedTasks should be 0 or 1.
  unfinishedTasks.push({ prop: cardPropStatus, type: 'DeleteCard' });
  // Here, current length of unfinishedTasks is 1 or 2.
  execTask();
};

export const deleteCard = (cardPropStatus: CardPropStatus) => {
  unfinishedTasks = unfinishedTasks.filter(task => {
    let bool = true;
    if (task.target === 'PropertyOnly') bool = false;
    if (!bool) {
      console.debug(
        `Skip unfinishedTask: [${task.type}: ${task.target}] ${task.prop.date.modifiedDate}`
      );
    }
    return bool;
  });

  console.debug(
    `Enqueue unfinishedTask: [Delete Avatar] ${cardPropStatus.date.modifiedDate}`
  );
  // Here, current length of unfinishedTasks should be 0 or 1.
  unfinishedTasks.push({ prop: cardPropStatus, type: 'DeleteCard' });
  // Here, current length of unfinishedTasks is 1 or 2.
  execTask();
};

export const saveCard = (cardPropStatus: CardPropStatus, target: SavingTarget) => {
  console.log(JSON.stringify(cardPropStatus));
  if (target === 'BodyOnly' || target === 'Card') {
    // Update modifiedDate of Card when _body is changed.
    cardPropStatus.date.modifiedDate = getCurrentDateAndTime();
  }
  else {
    // Update modifiedDate of Note when other properties are changed.
  }
  // eslint-disable-next-line complexity
  unfinishedTasks = unfinishedTasks.filter(task => {
    let bool = true;
    if (task.target === undefined) bool = false;
    else if (
      task.target === 'BodyOnly' &&
      (task.target === 'BodyOnly' || task.target === 'Card')
    )
      bool = false;
    else if (
      task.target === 'PropertyOnly' &&
      (task.target === 'PropertyOnly' || task.target === 'Card')
    )
      bool = false;
    else if (task.target === 'Card' && task.target === 'Card') bool = false;

    if (!bool) {
      console.debug(
        `Skip unfinishedTask: [${task.type}: ${task.target}] ${task.prop.date.modifiedDate}`
      );
    }
    return bool;
  });

  console.debug(
    `Enqueue unfinishedTask: [Save: ${target}] ${cardPropStatus.date.modifiedDate}`
  );
  // Here, current length of unfinishedTasks should be 0 or 1.
  unfinishedTasks.push({ prop: cardPropStatus, type: 'Save', target });
  // Here, current length of unfinishedTasks is 1 or 2.
  execTask();
};
