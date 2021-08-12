/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';
import prompt from 'electron-prompt';
import { app, dialog, Menu, MenuItemConstructorOptions, Tray } from 'electron';
import { closeSettings, openSettings, settingsDialog } from './settings';
import { createCard } from './card';
import { emitter } from './event';
import {
  CardAvatars,
  CardProp,
  CardPropSerializable,
  DEFAULT_CARD_GEOMETRY,
  TransformableFeature,
} from '../modules_common/cardprop';
import { getRandomInt } from '../modules_common/utils';
import { cardColors, ColorName, darkenHexColor } from '../modules_common/color';
import { addAvatarToWorkspace, setChangingToWorkspaceId } from './store_workspaces';
import { appIcon } from '../modules_common/const';
import { avatarWindows } from './avatar_window';
import { mainStore, MESSAGE } from './store';

/**
 * Task tray
 */

// Ensure a reference to Tray object is retained, or it will be GC'ed.
let tray: Tray;
export const destroyTray = () => {
  if (tray !== undefined && !tray.isDestroyed()) {
    tray.destroy();
  }
};

let currentLanguage: string;
let color = { ...cardColors };
delete color.transparent;

const createNewCard = () => {
  const geometry = { ...DEFAULT_CARD_GEOMETRY };
  geometry.x += getRandomInt(30, 100);
  geometry.y += getRandomInt(30, 100);

  let colorList = Object.entries(color);
  if (colorList.length === 0) {
    color = { ...cardColors };
    delete color.transparent;
    colorList = Object.entries(color);
  }
  const newColor: ColorName = colorList[getRandomInt(0, colorList.length)][0] as ColorName;
  delete color[newColor];

  const bgColor: string = cardColors[newColor];

  const newAvatars: CardAvatars = {};
  /** 
   * TODO: 
  
  newAvatars[getCurrentWorkspaceUrl()] = new TransformableFeature(
    {
      x: geometry.x,
      y: geometry.y,
      z: geometry.z,
      width: geometry.width,
      height: geometry.height,
    },
    {
      uiColor: darkenHexColor(bgColor),
      backgroundColor: bgColor,
      opacity: 1.0,
      zoom: 1.0,
    }
  );

  const id = await createCard(
    CardProp.fromObject(({
      avatars: newAvatars,
    } as unknown) as CardPropSerializable)
  );
   const newAvatar = avatars.get(getCurrentWorkspaceUrl() + id);
  if (newAvatar) {
    newAvatar.window.focus();
  }
 */
};

export const setTrayContextMenu = () => {
  if (!tray) {
    return;
  }
  const currentWorkspace = mainStore.getCurrentNoteProp();

  let changeWorkspaces: MenuItemConstructorOptions[] = [];
  if (currentWorkspace !== null) {
    changeWorkspaces = [...mainStore.getNotePropList()]
      .sort(function (a, b) {
        if (a.date.createdDate > b.date.createdDate) {
          return 1;
        }
        else if (a.date.createdDate < b.date.createdDate) {
          return -1;
        }
        return 0;
      })
      .map(workspace => {
        return {
          label: `${workspace.name}`,
          type: 'radio',
          checked: workspace._id === currentWorkspace._id,
          click: () => {
            if (workspace._id !== currentWorkspace._id) {
              closeSettings();
              if (Object.keys(mainStore.currentAvatarMap).length === 0) {
                emitter.emit('change-workspace', workspace._id);
              }
              else {
                setChangingToWorkspaceId(workspace._id);
                try {
                  // Remove listeners firstly to avoid focus another card in closing process
                  /** 
                 * TODO: 
                currentWorkspace.avatars.forEach(avatar => avatar.removeWindowListenersExceptClosedEvent());
                currentWorkspace.avatars.forEach(avatar => avatar.window.webContents.send('card-close'));
                */
                } catch (e) {
                  console.error(e);
                }
                // wait 'window-all-closed' event
              }
            }
          },
        };
      });
  }
  if (changeWorkspaces.length > 0) {
    changeWorkspaces.unshift({
      type: 'separator',
    } as MenuItemConstructorOptions);
  }

  const contextMenu = Menu.buildFromTemplate([
    /*
    {
      label: MESSAGE('newCard'),
      click: () => {
        createNewCard();
      },
    },
    {
      type: 'separator',
    },
    {
      label: MESSAGE('workspaceNew'),
      click: async () => {
        const newId = getNextWorkspaceId();
        const newName: string | void | null = await prompt({
          title: MESSAGE('workspace'),
          label: MESSAGE('workspaceNewName'),
          value: `${MESSAGE('workspaceName', String(workspaces.size + 1))}`,
          inputAttrs: {
            type: 'text',
            required: true,
          },
          height: 200,
        }).catch(e => console.error(e.message));

        if (
          newName === null ||
          newName === undefined ||
          newName === '' ||
          (newName as string).match(/^\s+$/)
        ) {
          return;
        }
        const workspace: Workspace = {
          name: newName as string,
          avatars: [],
        };
        workspaces.set(newId, workspace);
        await CardIO.createWorkspace(newId, workspace).catch((e: Error) =>
          console.error(e.message)
        );
        closeSettings();
        if (avatars.size === 0) {
          emitter.emit('change-workspace', newId);
        }
        else {
          setChangingToWorkspaceId(newId);
          avatars.forEach(avatar => avatar.window.webContents.send('card-close'));
        }
      },
    },
    {
      label: MESSAGE('workspaceRename'),
      click: async () => {
        const newName: string | void | null = await prompt({
          title: MESSAGE('workspace'),
          label: MESSAGE('workspaceNewName'),
          value: getCurrentWorkspace().name,
          inputAttrs: {
            type: 'text',
            required: true,
          },
          height: 200,
        }).catch(e => console.error(e.message));

        if (
          newName === null ||
          newName === undefined ||
          newName === '' ||
          (newName as string).match(/^\s+$/)
        ) {
          return;
        }

        const workspace = getCurrentWorkspace();
        workspace.name = newName as string;
        await CardIO.updateWorkspace(getCurrentWorkspaceId(), workspace).catch((e: Error) =>
          console.error(e.message)
        );
        setTrayContextMenu();
        avatars.forEach(avatar => avatar.resetContextMenu());
      },
    },
    {
      label: MESSAGE('workspaceDelete'),
      enabled: workspaces.size > 1,
      click: async () => {
        if (workspaces.size <= 1) {
          return;
        }
        if (getCurrentWorkspace().avatars.length > 0) {
          dialog.showMessageBox({
            type: 'info',
            buttons: ['OK'],
            message: MESSAGE('workspaceCannotDelete'),
          });
          return;
        }
        workspaces.delete(getCurrentWorkspaceId());
        await CardIO.deleteWorkspace(getCurrentWorkspaceId()).catch((e: Error) =>
          console.error(`Error in workspaceDelete: ${e.message}`)
        );
        setTrayContextMenu();
        emitter.emit('change-workspace', '0');
      },
    },
  */
    ...changeWorkspaces,
    {
      type: 'separator',
    },
    {
      label: MESSAGE('settings'),
      click: () => {
        openSettings();
      },
    },
    {
      label: MESSAGE('exit'),
      click: () => {
        if (!currentWorkspace) {
          return;
        }
        if (settingsDialog && !settingsDialog.isDestroyed()) {
          settingsDialog.close();
        }
        setChangingToWorkspaceId('exit');
        closeSettings();
        if (Object.keys(mainStore.currentAvatarMap).length === 0) {
          emitter.emit('exit');
        }
        else {
          try {
            for (const url in mainStore.currentAvatarMap) {
              avatarWindows.get(url)!.window.webContents.send('card-close');
            }
          } catch (e) {
            console.error(e);
            emitter.emit('exit');
          }
        }
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  // const version = process.env.npm_package_version; // It is only available when the app is started by 'npm start'
  let taskTrayToolTip = `${app.getName()}  ${app.getVersion()}`;
  if (!app.isPackaged) {
    taskTrayToolTip += ' (Development)';
  }
  tray.setToolTip(taskTrayToolTip);
};

export const initializeTaskTray = () => {
  tray = new Tray(path.join(__dirname, '../assets/' + appIcon));
  currentLanguage = mainStore.settings.language;
  setTrayContextMenu();
  /*
  tray.on('click', () => {
    createNewCard();
  });
  */
};

emitter.on('updateTrayContextMenu', () => {
  const newLanguage = mainStore.settings.language;
  if (currentLanguage !== newLanguage) {
    currentLanguage = newLanguage;
    setTrayContextMenu();
  }
});
