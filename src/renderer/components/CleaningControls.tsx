import React from 'react';

interface CleaningControlsProps {
  profile: string;
  onProfileChange: (profile: string) => void;
  onClean: () => void;
  disabled?: boolean;
}

const CleaningControls: React.FC<CleaningControlsProps> = ({
  profile,
  onProfileChange,
  onClean,
  disabled
}) => {
  const profiles = [
    {
      id: 'social',
      name: 'Социальные сети',
      description: 'Удаление GPS, сохранение технических данных',
      icon: '🌐'
    },
    {
      id: 'business',
      name: 'Деловая переписка',
      description: 'Удаление авторов, истории, путей',
      icon: '💼'
    },
    {
      id: 'anonymous',
      name: 'Полная анонимность',
      description: 'Удаление всех метаданных',
      icon: '🕶️'
    },
    {
      id: 'manual',
      name: 'Ручной режим',
      description: 'Выбор конкретных полей',
      icon: '🎛️'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Профили очистки</h2>
        <div className="grid grid-cols-2 gap-3">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => onProfileChange(p.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                profile === p.id 
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-xl">{p.icon}</span>
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{p.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t">
        <button
          onClick={onClean}
          disabled={disabled}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {disabled ? 'Выберите файлы...' : 'Начать очистку метаданных'}
        </button>
        
        <div className="mt-4 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>Режим:</span>
            <span className="font-medium">{profiles.find(p => p.id === profile)?.name}</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Примечание: Всегда создается резервная копия перед изменением файлов
          </div>
        </div>
      </div>
    </div>
  );
};

export default CleaningControls;
