const { app, BrowserWindow, ipcMain } = require('electron');
const express = require('express');
const ytdl = require('ytdl-core');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

const server = express();
const PORT = 3000;

let channelUrl = '';

server.get('/check-new-video', async (req, res) => {
    try {
        const response = await axios.get(channelUrl);
        const $ = cheerio.load(response.data);
        const latestVideo = $('a#video-title').first();
        const videoId = latestVideo.attr('href').split('=')[1];
        const title = latestVideo.attr('title');
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

        res.json({ videoId, title, thumbnailUrl });
    } catch (error) {
        res.status(500).send('Error fetching channel data');
    }
});

ipcMain.on('set-channel', (event, url) => {
    channelUrl = url;
});

ipcMain.on('download-video', async (event, videoUrl) => {
    const videoId = videoUrl.split('v=')[1];
    const title = await getVideoTitle(videoId);
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // Descarga el video
    const videoStream = ytdl(videoUrl);
    const videoPath = `./downloads/${title}.mp4`;
    videoStream.pipe(fs.createWriteStream(videoPath));

    // Descarga la miniatura
    const thumbnailPath = `./downloads/${title}.jpg`;
    const response = await axios({
        url: thumbnailUrl,
        responseType: 'stream',
    });
    response.data.pipe(fs.createWriteStream(thumbnailPath));

    // Guarda el título y la descripción
    const description = await getVideoDescription(videoId);
    fs.writeFileSync(`./downloads/${title}.txt`, `Title: ${title}\nDescription: ${description}`);

    event.reply('download-complete', title);
});

async function getVideoTitle(videoId) {
    const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`);
    const $ = cheerio.load(response.data);
    return $('h1.title').text().trim();
}

async function getVideoDescription(videoId) {
    const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`);
    const $ = cheerio.load(response.data);
    return $('yt-formatted-string#description').text().trim();
}

app.on('ready', () => {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile('index.html');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
// main.js

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Define la ruta para el archivo HTML principal.
const indexHtmlPath = path.join(__dirname, 'index.html');

// Crea una ventana de navegador.
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Si utilizas Node.js, debes desactivar la aislamiento de contexto
        }
    });

    // Carga la página index.html.
    mainWindow.loadFile(indexHtmlPath);

    // Abre el DevTools (opcional).
    //mainWindow.webContents.openDevTools();
}

// Cuando la aplicación esté lista, crea la ventana.
app.on('ready', createWindow);

// Cierra la aplicación al cerrar todas las ventanas.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Maneja el evento de descarga desde el proceso principal.
ipcMain.on('download-progress', (event, progress) => {
    mainWindow.webContents.send('download-progress', progress);
});

// Maneja el evento de descarga completada desde el proceso principal.
ipcMain.on('download-completed', (event, { title, status }) => {
    mainWindow.webContents.send('download-completed', { title, status });
});
// main.js (continuación)

// Maneja el evento de inicio de descarga desde el proceso principal.
ipcMain.on('start-download', (event, url) => {
    const { download } = require('electron');
    const title = 'Archivo de ejemplo';

    // Inicia la descarga (reemplaza con tu lógica de descarga).
    const downloadItem = download({
        url,
        saveAs: true,
        filename: title,
    });

    downloadItem.on('progress', (progress) => {
        event.reply('download-progress', progress);
    });

    downloadItem.on('done', (event, state) => {
        if (state === 'completed') {
            event.reply('download-completed', { title, status: 'ok' });
        } else {
            event.reply('download-completed', { title, status: 'error' });
        }
    });
});