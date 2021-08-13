const path = require('path');

module.exports = {
  target: 'web',
  entry: './src/renderer.ts',
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: 'renderer.js',
  },

  resolve: {
    extensions: [
      '.ts',
      '.js', // for node_modules
    ],
    modules: ['node_modules'],
  },
};
