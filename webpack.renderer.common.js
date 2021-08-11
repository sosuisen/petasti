const path = require('path');

module.exports = {
  target: 'web',
  entry: './src/renderer.ts',
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: 'renderer.js',
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.renderer.json',
            },
          },
        ],
      },
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader',
      },
    ],
  },
  resolve: {
    extensions: [
      '.ts',
      '.js', // for node_modules
    ],
    modules: ['node_modules'],
  },
};
