const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');
const path = require('path');
const codePath = path.resolve(__dirname, 'src/code.js');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  devServer: {
    hot: true,

    before: function(app, server) {
      app.post('/update-code', function(req, res) {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          fs.writeFile(codePath, body, err => {
            if (err) {
              console.error(err);
              res.sendStatus(500);
            } else {
              res.sendStatus(200);
            }
          });
        });
      });
    }
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),

    new CopyPlugin({
      patterns: [
        { from: 'assets', to: '' },
      ],
    }),
  ],
};
