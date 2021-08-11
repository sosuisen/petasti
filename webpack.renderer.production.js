const { merge } = require('webpack-merge');
const common = require('./webpack.renderer.common.js');

module.exports = merge(common, {
  mode: 'production',
});
