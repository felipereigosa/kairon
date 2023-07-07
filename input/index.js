const { app, BrowserWindow, ipcMain } = require('electron')
const express = require('express');
const cors = require('cors');
const path = require('path');

const sseApp = express();
sseApp.use(cors());

let client;
sseApp.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  client = res;
});

sseApp.listen(3000, () => {
  console.log('SSE server is running on port 3000');
});

function createWindow () {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    }
  })

  win.loadFile('index.html')
  win.setMenuBarVisibility(false)
}

ipcMain.on('keydown', (_, event) => {
  if (client) {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  }
});

ipcMain.on('pointerdown', (_, event) => {
  if (client) {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  }
});

ipcMain.on('pointermove', (_, event) => {
  if (client) {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  }
});

ipcMain.on('pointerup', (_, event) => {
  if (client) {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  }
});

ipcMain.on('resize', (_, event) => {
  if (client) {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  }
});

app.whenReady().then(createWindow)
