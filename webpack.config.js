const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');
const path = require('path');
const cubeFilePath = path.resolve(__dirname, 'src/cube.js');

module.exports = {
  mode: 'development',
  devServer: {
    hot: true,

    before: function(app, server) {
      app.post('/update-cube', function(req, res) {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          fs.writeFile(cubeFilePath, body, err => {
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
  ],
};
