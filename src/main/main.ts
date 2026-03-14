import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  // Загружаем приложение
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools(); // Открыть DevTools для отладки
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Упрощенные IPC обработчики
ipcMain.handle('analyze-file', async (_event, filePath: string) => {
  console.log('Анализируем файл:', filePath);
  return {
    metadata: {
      format: 'TEST',
      size: 1024,
      categories: [
        {
          name: 'Тест',
          risk: 'medium',
          fields: [
            { key: 'Файл', value: filePath, risk: 'low', removable: false },
            { key: 'Статус', value: 'Тестовые данные', risk: 'low', removable: false },
          ],
        },
      ],
      raw: {},
    },
    riskAssessment: {
      overallScore: 30,
      level: 'medium',
      warnings: ['Тестовый режим'],
      details: [],
    },
    filePath,
    fileName: path.basename(filePath),
  };
});

ipcMain.handle('process-files', async (_event, files: string[], profile: string) => {
  console.log(`Обработка файлов: ${files.length}, профиль: ${profile}`);
  return files.map(filePath => ({
    filePath,
    success: true,
    error: undefined,
    originalMetadata: { format: '', size: 0, categories: [], raw: {} },
    riskScore: 30,
    integrityChecked: true,
    outputPath: filePath,
  }));
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

// Инициализация
app.whenReady().then(() => {
  console.log('Приложение запускается...');
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
