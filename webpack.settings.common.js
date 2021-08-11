const path = require('path');
const cssModulesScopedName = '[path]___[name]__[local]___[hash:base64:5]';

module.exports = {
  entry: './src/dialog_settings/index.ts',
  target: 'electron-renderer',
  output: {
    path: path.resolve(__dirname, 'dist/settings'),
    filename: 'main.js',
  },

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
              configFile: 'tsconfig.settings.json',
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
  resolve: {
    extensions: [
      '.ts',
      '.tsx',
      '.js', // for node_modules
    ],
    modules: ['node_modules'],
  },
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
  },
};
