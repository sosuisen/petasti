const { merge } = require('webpack-merge');
const common = require('./webpack.renderer.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.renderer.development.json',
            },
          },
        ],
      },
      /*      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader',
      }, */
    ],
  },
});
