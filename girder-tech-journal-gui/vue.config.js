const path = require('path');
const webpack = require('webpack');

module.exports = {
  lintOnSave: false,

  baseUrl: '/tech_journal/',

  devServer: {
    port: 8081,
    proxy: {
      '/api/v1': {
        // Assume Girder API is running here in development
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },

  chainWebpack: (config) => {
    // Alias "@" to the "./src" directory for imports
    config.resolve.alias
      .set('@$', path.resolve(__dirname, 'src'));

    // Required to make many Girder imports work
    config.plugin('provide')
      .use(webpack.ProvidePlugin, [{
        $: 'jquery',
        jQuery: 'jquery',
        'window.jQuery': 'jquery',
      }]);

    // Modify existing Pug loader
    // We want to use the full 'pug-loader' instead of 'pug-plain-loader' (which just works with
    // 'vue-loader')
    config.module
      .rule('pug')
      .use('pug-plain-loader')
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
        plugins: loader => [
          require('autoprefixer')(),
        ],
      }));
    config.module
      .rule('css')
      .oneOf('normal')
      .use('postcss-loader')
      .tap(options => ({
        ...options,
        ident: 'postcss',
        plugins: loader => [
          require('autoprefixer')(),
        ],
      }));
  },
};
