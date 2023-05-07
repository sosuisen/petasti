const path = require('path');

module.exports = {
  target: 'web',
  entry: './src/dashboard/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/dashboard'),
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
