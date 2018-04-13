import path from 'path';

export default {
  entry: './web_external/main.js',
  output: {
    path: path.resolve('dist'),
    filename: 'js/[name].[chunkhash].js',
    chunkFilename: 'js/[id].[chunkhash].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
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
      }
    ]
  }
};
