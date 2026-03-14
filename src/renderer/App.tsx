import React, { useState } from 'react';

function App() {
  const [message, setMessage] = useState('Приложение запущено!');

  const handleTest = async () => {
    try {
      const result = await window.api.analyzeFile('C:/test/test.jpg');
      setMessage(`Файл проанализирован: ${result.fileName}`);
      console.log('Результат анализа:', result);
    } catch (error) {
      setMessage(`Ошибка: ${error}`);
    }
  };

  const handleSelectFolder = async () => {
    const folder = await window.api.selectDirectory();
    if (folder) {
      setMessage(`Выбрана папка: ${folder}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🛡️ MetaGuard
          </h1>
          <p className="text-gray-600">
            Приложение для защиты метаданных - Тестовый режим
          </p>
        </header>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Тестовая панель</h2>
          
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-lg font-medium text-blue-800">{message}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleTest}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Тест анализа файла
            </button>
            
            <button
              onClick={handleSelectFolder}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Выбрать папку
            </button>
            
            <button
              onClick={() => window.api.log('Тестовое сообщение')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Лог в консоль
            </button>
            
            <button
              onClick={() => window.api.saveReport()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Сохранить отчет
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Статус системы</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span>Electron: Запущен</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span>IPC связь: Работает</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
              <span>Файловые парсеры: В разработке</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <span>Node.js: {process.version}</span>
            </div>
          </div>
        </div>

        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>MetaGuard v1.0.0 | Тестовый запуск | {new Date().toLocaleDateString()}</p>
          <p className="mt-2">Проверьте консоль разработчика (F12) для отладки</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
