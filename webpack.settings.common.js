const path = require('path');

module.exports = {
  target: 'web',
  entry: './src/dialog_settings/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/settings'),
    filename: 'main.js',
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
