"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  // Файловые операции
  analyzeFile: (filePath) => electron.ipcRenderer.invoke("analyze-file", filePath),
  processFiles: (files, profile) => electron.ipcRenderer.invoke("process-files", files, profile),
  selectFiles: () => electron.ipcRenderer.invoke("select-files"),
  selectDirectory: () => electron.ipcRenderer.invoke("select-directory"),
  saveReport: (report, format) => electron.ipcRenderer.invoke("save-report", report, format),
  cleanFile: (filePath, mode) => electron.ipcRenderer.invoke("clean-file", filePath, mode),
  saveCleanedFile: (cleanResult) => electron.ipcRenderer.invoke("save-cleaned-file", cleanResult),
  saveCleanedFileAuto: (cleanResult) => electron.ipcRenderer.invoke("save-cleaned-file-auto", cleanResult),
  openFolder: (folderPath) => electron.ipcRenderer.invoke("open-folder", folderPath),
  // Диалоги
  showMessage: (options) => electron.ipcRenderer.invoke("show-message", options),
  // События
  onOpenFiles: (callback) => electron.ipcRenderer.on("open-files-dialog", callback),
  onOpenFolder: (callback) => electron.ipcRenderer.on("open-folder", callback),
  onSetProfile: (callback) => electron.ipcRenderer.on("set-profile", callback),
  // Системная информация
  platform: process.platform,
  isDev: false,
  // Утилиты
  openExternal: (url) => electron.ipcRenderer.invoke("open-external", url),
  openDevTools: () => electron.ipcRenderer.send("open-devtools")
});
