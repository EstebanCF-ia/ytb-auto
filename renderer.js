// renderer.js

const { ipcRenderer } = require('electron');

const downloadButton = document.getElementById('download-button ');
const progressBar = document.getElementById('progress-bar');
const statusLabel = document.getElementById('status-label');

downloadButton.addEventListener('click', () => {
    // Inicia la descarga (reemplaza con tu lógica de descarga).
    ipcRenderer.send('start-download', 'https://example.com/file.zip');
});

ipcRenderer.on('download-progress', (event, progress) => {
    progressBar.value = progress;
    statusLabel.textContent = `Descargando... ${progress}%`;
});

ipcRenderer.on('download-completed', (event, { title, status }) => {
    if (status === 'ok') {
        statusLabel.textContent = `¡Descarga completa! ${title}`;
        // Agrega un icono de éxito aquí.
    } else {
        statusLabel.textContent = `Error al descargar ${title}`;
        // Agrega un icono de error aquí.
    }
});