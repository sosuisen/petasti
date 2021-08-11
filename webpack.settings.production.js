const { merge } = require('webpack-merge');
const common = require('./webpack.settings.common.js');

module.exports = merge(common, {
  mode: 'production',
});
