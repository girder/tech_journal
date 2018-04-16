import path from 'path';
import webpack from 'webpack';

export default {
  entry: './web_external/main.js',
  output: {
    path: path.resolve('dist'),
    filename: 'js/[name].js',
  },
  resolve: {
    // This alias is needed to ensure that a single jquery codebase is used by
    // both tech_journal and bootstrap in order to make Girder's modal views
    // (e.g., LoginView) work properly.
    alias: {
      'jquery': require.resolve('jquery')
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      jQuery: 'jquery',
      $: 'jquery',
      'window.jQuery': 'jquery'
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/env', {
                targets: {
                  node: 'current'
                }
              }],
            ]
          }
        }
      },
      {
        test: /\.pug$/,
        use: 'pug-loader'
      },
      {
        test: /\.styl$/,
        use: ['style-loader', 'css-loader', 'stylus-loader']
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.jpe?g$|\.gif$|\.png$|\.woff$|\.wav$|\.mp3$|\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$|\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: 'url-loader'
      }
    ]
  }
};
