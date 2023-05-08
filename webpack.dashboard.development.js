const cssModulesScopedName = '[path]___[name]__[local]___[hash:base64:5]';

const createElectronReloadWebpackPlugin = require('electron-reload-webpack-plugin');

const { merge } = require('webpack-merge');
const common = require('./webpack.dashboard.common.js');

// Create one plugin for both renderer and main process
const electronReloadWebpackPlugin = createElectronReloadWebpackPlugin({
  // Path to `package.json` file with main field set to main process file path, or just main process file path
  path: './',
  // or just `path: './'`,
  // Other 'electron-connect' options
  logLevel: 0,
});

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  plugins: [electronReloadWebpackPlugin('electron-renderer')],

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: [
                // 3) .jsx => .js
                'transform-react-jsx',
                // 2) styleName in .jsx => className in .jsx
                ['react-css-modules', { generateScopedName: cssModulesScopedName }],
              ],
            },
          },
          // 1) .ts => .js,  .tsx => .jsx
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.dashboard.development.json',
            },
          },
        ],
      },
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader',
      },
      {
        test: /\.css$/,
        use: [
          // import .css in .js
          'style-loader',
          {
            /**
             * Must use css-loader@3 because hash generator of css-loader@4 is different from that of 'react-css-modules'
             * See https://github.com/webpack-contrib/css-loader/issues/877
             */

            // Apply css modules
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: cssModulesScopedName,
              },
              importLoaders: 1,
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
});
