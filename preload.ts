import { contextBridge, ipcRenderer } from 'electron';

// Минимальный API для тестирования
contextBridge.exposeInMainWorld('api', {
  analyzeFile: (filePath: string) => ipcRenderer.invoke('analyze-file', filePath),
  processFiles: (files: string[], profile: string) => ipcRenderer.invoke('process-files', files, profile),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveReport: () => ipcRenderer.invoke('save-report', 'Тестовый отчет', 'txt'),
  
  // Для отладки
  log: (message: string) => console.log(message),
});

declare global {
  interface Window {
    api: {
      analyzeFile: (filePath: string) => Promise<any>;
      processFiles: (files: string[], profile: string) => Promise<any>;
      selectDirectory: () => Promise<string | null>;
      saveReport: () => Promise<any>;
      log: (message: string) => void;
    };
  }
}
