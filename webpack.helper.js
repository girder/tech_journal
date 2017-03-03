var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = function(config,data) {
  var pluginSourceDir= path.resolve(data.pluginDir,'../../node_modules/tinymce')
  console.log(pluginSourceDir);
  config.module = config.module || {};
  config.module.loaders = [
      {
        test: require.resolve('tinymce'),
        include: pluginSourceDir,
        loaders: [
          'imports?this=>window',
          'exports?window.tinymce'
        ]
      },
      {
        test:  /tinymce\/(themes|plugins)\//,
        include: pluginSourceDir,
        loaders: [
          'imports?this=>window',
        ]
      },
      {
        test:  /\.css$/i,
        include: pluginSourceDir,
        loader:ExtractTextPlugin.extract({ fallbackLoader: 'style-loader', loader: 'css-loader' })
      },
      {
       test: /\.(jpe?g|gif|png|svg|woff|ttf|wav|mp3)$/i,
       include: pluginSourceDir,
       loaders: [
           'file?hash=sha512&digest=hex&name=[hash].[ext]',
           'image-webpack?bypassOnDebug&optimizationLevel=7&interlaced=false',
       ]
      }
   ].concat(config.module.loaders);
   return config
}
