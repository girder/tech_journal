const process = require('process');
const webpack = require('webpack'); // eslint-disable-line import/no-extraneous-dependencies
const autoprefixer = require('autoprefixer'); // eslint-disable-line import/no-extraneous-dependencies

module.exports = {
  lintOnSave: false,

  publicPath: '/tech_journal/',

  devServer: {
    port: 8081,
    proxy: {
      '/api/v1': {
        // Girder API must be running here in development
        target: process.env.API_HOST || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },

  chainWebpack: (config) => {
    // Required to make many Girder imports work
    config.plugin('provide')
      .use(webpack.ProvidePlugin, [{
        $: 'jquery',
        jQuery: 'jquery',
        'window.jQuery': 'jquery',
      }]);

    // Modify existing Pug loader
    // For separate Pug files, we want to use the full 'pug-loader'
    config.module
      .rule('pug')
      .oneOf('pug-template')
      .uses
      .clear();
    config.module
      .rule('pug')
      .oneOf('pug-template')
      .use('pug-loader')
      .loader('pug-loader');

    // postcss-loader is not picking up the config within 'package.json', causing errors
    // This seems to work around the issue
    // See: https://github.com/postcss/postcss-loader/issues/204
    config.module
      .rule('stylus')
      .oneOf('normal')
      .use('postcss-loader')
      .tap(options => ({
        ...options,
        ident: 'postcss',
        plugins: () => [
          autoprefixer(),
        ],
      }));
    config.module
      .rule('css')
      .oneOf('normal')
      .use('postcss-loader')
      .tap(options => ({
        ...options,
        ident: 'postcss',
        plugins: () => [
          autoprefixer(),
        ],
      }));
  },
};
