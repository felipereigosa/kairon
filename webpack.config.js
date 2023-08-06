const fs = require('fs')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const express = require('express')
const codePath = path.resolve(__dirname, 'src/code.js')
const statePath = path.resolve(__dirname, 'state.js')
const child_process = require('child_process')
const copilot = child_process.spawn('node', ['./dist/agent.js'])

let buffer = '';
let contentLength = null;
let callbacks = {}

copilot.stdout.on('data', (data) => {
  buffer += data

  while (true) {
    if (contentLength === null) {
      const match = buffer.match(/Content-Length: (\d+)/)
      if (match) {
        contentLength = Number(match[1])
      }
    }
    const separatorPosition = buffer.indexOf('\r\n\r\n')
    if (separatorPosition !== -1) {
      const headersLength = separatorPosition + 4
      const totalLength = headersLength + contentLength
      if (buffer.length >= totalLength) {
        const body = buffer.slice(headersLength, totalLength)
        const obj = JSON.parse(body)
        if (obj.id !== undefined) {
          if (callbacks[obj.id]) {
            callbacks[obj.id](obj)
            callbacks[obj.id] = null
          }
        }
        buffer = buffer.slice(totalLength)
        contentLength = null
      } else {
        break
      }
    } else {
      break
    }
  }
})

let requestId = 0
function sendRequest(method, params, callback) {
  const obj = {
    jsonrpc: "2.0",
    method: method,
    params: params
  }
  if (callback) obj.id = requestId++
  callbacks[obj.id] = callback
  const message = JSON.stringify(obj)
  const fullMessage =
        `Content-Length: ${Buffer.byteLength(message, 'utf-8')}\r\n\r\n${message}`
  copilot.stdin.write(fullMessage)
}
const uri = "./src/index.js"

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})

sendRequest("initialize", {capabilities:
                           {workspace:
                            {workspaceFolders: true}}}, obj => {})

sendRequest('signInInitiate', {dummy: "signInInitiate"},
            obj => {
              if (obj.result.status === 'PromptUserDeviceFlow') {
                const code = obj.result.userCode
                const url = obj.result.verificationUri
                console.log(`code = ${code} url = ${url}`)
                console.log("Please login with code at url then press enter")

                readline.question("", () => {
                  sendRequest("signInConfirm",
                              {userCode: obj.result.userCode}, () => {})
                })
              }
            })

function getCompletion (req, res) {
  sendRequest("textDocument/didOpen",
              {textDocument: {uri,
                              languageId: "javascript",
                              version: 0,
                              text: req.body}})

  sendRequest("getCompletions", {doc: {version: 0,
                                       tabSize: 4,
                                       indentSize: 4,
                                       insertSpaces: true,
                                       path: uri,
                                       uri,
                                       relativePath: uri.slice(2),
                                       languageId: "javascript",
                                       position: {line: 100, character: 0}}},
              obj => res.json(obj.result))
}

module.exports = {
  mode: 'development',
  devServer: {
    hot: true,

    before: function(app, server) {
      app.use(express.json())
      app.use(express.text())

      app.post('/update-code', function(req, res) {
        fs.writeFile(codePath, req.body, err => {
          if (err) {
            console.error(err)
            res.sendStatus(500)
          } else {
            res.sendStatus(200)
          }
        })
      })

      app.post('/complete-code', getCompletion)

      app.post('/save-state', function(req, res) {
        fs.writeFile(statePath, req.body, err => {
          if (err) {
            console.error(err)
            res.sendStatus(500)
          } else {
            res.sendStatus(200)
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
