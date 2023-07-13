const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');
const path = require('path');
const codePath = path.resolve(__dirname, 'src/code.js');
const savePath = path.resolve(__dirname, 'state.js');
const logPath = path.resolve(__dirname, 'log.js');
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
          const lines = body.split('\n');
          fs.appendFile(logPath, lines.slice(8, lines.length - 6).join('\n'),
                        err => {
                          if (err) {
                            console.error(err);
                          }
                        });
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
          fs.writeFile("/tmp/code.txt", code, (err) => {
            exec(`emacs --batch --eval '(load-file "copilot.el")' --eval '(complete)'`,
                 (error, stdout, stderr) => {
                   const data = JSON.parse(stdout);
                   res.json(data);
                 });
          });
        });
      });

      app.post('/save', function(req, res) {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          fs.writeFile(savePath, body, err => {
            if (err) {
              console.error(err);
              res.sendStatus(500);
            } else {
              res.sendStatus(200);
            }
          });
        });
      });

      app.post('/open', function(req, res) {
        fs.readFile(savePath, 'utf8', (err, data) => {
          if (err) {
            console.error(err);
          }
          else {
            res.json(JSON.parse(data));
          }
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
