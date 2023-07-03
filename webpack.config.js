const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');
const path = require('path');
const codePath = path.resolve(__dirname, 'src/code.js');
const CopyPlugin = require('copy-webpack-plugin');
const { exec } = require('child_process');

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
      app.post('/complete-code', function(req, res) {
        let code = '';
        req.on('data', chunk => {
          code += chunk.toString();
        });
        req.on('end', () => {
          exec(`emacsclient -e '(complete "${code}")'`,
               (error, stdout, stderr) => {
                 const data = JSON.parse(JSON.parse(stdout));
                 res.json(data);
               });
        });
      });
    },
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
