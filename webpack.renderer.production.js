const { merge } = require('webpack-merge');
const common = require('./webpack.renderer.common.js');

module.exports = merge(common, {
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.renderer.production.json',
            },
          },
        ],
      },
    ],
  },
});
