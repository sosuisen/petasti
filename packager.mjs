import packager from 'electron-packager';
import electronRebuild from 'electron-rebuild';
import electronInstaller from 'electron-winstaller';
import createDMG from 'electron-installer-dmg';
import packageJson from './package.json' assert{ type: "json" };

const createInstaller = async () => {

  // Enter app name without dashes & spaces",
  const name = 'Petasti';

  // Default App icon
  // If the file extension of icon is omitted, its is auto-completed to the correct extension based on the platform.
  const icon = 'assets/petasti-icon'; 

  // Use png2icons to create .icns for macOS
  // https://blog1.mammb.com/entry/2023/03/29/090000
  // https://github.com/idesis-gmbh/png2icons
  
  // A URL to an ICO file displayed in Control Panel > Programs and Features
  // Defaults to the Atom icon.
  // iconUrl must be a url that start with http or https. Squirrel cannot accept a local file.
  const iconUrl = 'https://raw.githubusercontent.com/sosuisen/petasti-project/main/assets/petasti-icon.ico';

  const copyright = '© 2023 Hidekazu Kubota';

  await packager({
    dir: '.',
    name: name,
    appCopyright: copyright,
    asar: true,
    icon: icon,
    overwrite: true,
    ignore: ['^(\/html|\/installer|\/petasti_data|\/tree_stickies_data|\/out|\/src)', '\.vscode|\.eslint.*|\.gitignore|tsconfig.*|webpack.*|packager.mjs|package-lock.json|config.json|README.md'],
    win32metadata: {
      ProductName: packageJson.productName,
      FileDescription: packageJson.productName,
    },
    // … other options
    afterCopy: [(buildPath, electronVersion, platform, arch, callback) => {
      electronRebuild.rebuild({ buildPath, electronVersion, arch })
        .then(() => callback())
        .catch((error) => callback(error));
    }],
  
  }).catch(e => console.log(`Error in Packager: ${e.message}`));

  console.log('Building windows installer...');
  await electronInstaller.createWindowsInstaller({
      appDirectory: './Petasti-win32-x64',
      outputDirectory: './installer/',
      title: name,
      name: name, // name must be without - (dashes). See https://github.com/electron/windows-installer/issues/264
      exe: `${name}.exe`,
      iconUrl: iconUrl, // icon 
      setupExe: `${name}-${packageJson.version}-Setup.exe`,
      noMsi: true
    }).catch (e => console.log(`Error in Windows Installer: ${e.message}`));

  console.log('Building macOS installer...');

  await createDMG({
    appPath: './Petasti-darwin-x64/Petasti.app',
    out: './Petasti-darwin-x64',
    title: `${name}-${packageJson.version}`,
    name: `${name}-${packageJson.version}`,
  }).catch (e => console.log(`Error in macOS Installer: ${e.message}`));
};

createInstaller();
