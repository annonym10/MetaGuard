import { contextBridge, ipcRenderer } from 'electron';

// Безопасный API для рендер-процесса
contextBridge.exposeInMainWorld('api', {
  // Файловые операции
  analyzeFile: (filePath: string) => ipcRenderer.invoke('analyze-file', filePath),
  processFiles: (files: string[], profile: string) => ipcRenderer.invoke('process-files', files, profile),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveReport: (report: string, format: string) => ipcRenderer.invoke('save-report', report, format),
  
  // Диалоги
  showMessage: (options: any) => ipcRenderer.invoke('show-message', options),
  
  // События
  onOpenFiles: (callback: (event: any, files: string[]) => void) => 
    ipcRenderer.on('open-files-dialog', callback),
  onOpenFolder: (callback: (event: any, folder: string) => void) =>
    ipcRenderer.on('open-folder', callback),
  onSetProfile: (callback: (event: any, profile: string) => void) =>
    ipcRenderer.on('set-profile', callback),
  
  // Системная информация
  platform: process.platform,
  isDev: process.env.NODE_ENV === 'development',
  
  // Утилиты
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
});

// Типы для TypeScript
declare global {
  interface Window {
    api: {
      analyzeFile: (filePath: string) => Promise<any>;
      processFiles: (files: string[], profile: string) => Promise<any>;
      selectDirectory: () => Promise<string>;
      saveReport: (report: string, format: string) => Promise<string | null>;
      showMessage: (options: any) => Promise<any>;
      onOpenFiles: (callback: (event: any, files: string[]) => void) => void;
      onOpenFolder: (callback: (event: any, folder: string) => void) => void;
      onSetProfile: (callback: (event: any, profile: string) => void) => void;
      platform: string;
      isDev: boolean;
      openExternal: (url: string) => Promise<void>;
    };
  }
}
