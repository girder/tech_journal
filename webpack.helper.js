var webpack = require('webpack');

module.exports = function (config, info) {
  config.plugins.push(new webpack.EnvironmentPlugin({
    GA_KEY: ''
  }));

  return config;
};
