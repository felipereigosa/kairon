const fs = require('fs')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const express = require('express');
const codePath = path.resolve(__dirname, 'src/code.js')
const statePath = path.resolve(__dirname, 'state.js')
const { exec } = require('child_process')

module.exports = {
  mode: 'development',
  devServer: {
    hot: true,

    before: function(app, server) {
      app.use(express.json());
      app.use(express.text());

      app.post('/update-code', function(req, res) {
        fs.writeFile(codePath, req.body, err => {
          if (err) {
            console.error(err);
            res.sendStatus(500);
          } else {
            res.sendStatus(200);
          }
        })
      })

      app.post('/complete-code', function(req, res) {
        fs.writeFile("/tmp/code.txt", req.body, (err) => {
          exec(`emacs --batch --eval '(load-file "copilot.el")' --eval '(complete)'`,
               (error, stdout, stderr) => {
                 const data = JSON.parse(stdout)
                 res.json(data)
               })
        })
      })

      app.post('/save-state', function(req, res) {
        fs.writeFile(statePath, req.body, err => {
          if (err) {
            console.error(err);
            res.sendStatus(500);
          } else {
            res.sendStatus(200);
          }
        })
      })

      app.post('/load-state', function(req, res) {
        fs.readFile(statePath, 'utf8', (err, data) => {
          res.send(data)
        })
      })
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
}
