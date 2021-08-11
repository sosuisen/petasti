const createElectronReloadWebpackPlugin = require('electron-reload-webpack-plugin');

const { merge } = require('webpack-merge');
const common = require('./webpack.settings.common.js');

// Create one plugin for both renderer and main process
const ElectronReloadWebpackPlugin = createElectronReloadWebpackPlugin({
  // Path to `package.json` file with main field set to main process file path, or just main process file path
  path: './',
  // or just `path: './'`,
  // Other 'electron-connect' options
  logLevel: 0,
});

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  plugins: [ElectronReloadWebpackPlugin('electron-renderer')],
});
