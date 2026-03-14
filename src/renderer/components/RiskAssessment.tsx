import React from 'react';
import { RiskAssessment as RiskAssessmentType } from '../../types';

interface RiskAssessmentProps {
  assessment: RiskAssessmentType;
}

const RiskAssessment: React.FC<RiskAssessmentProps> = ({ assessment }) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressColor = (score: number) => {
    if (score < 30) return 'bg-green-500';
    if (score < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Оценка рисков</h3>
          <p className="text-sm text-gray-600">Общий индекс риска утечки данных</p>
        </div>
        <span className={`px-3 py-1 rounded-full font-medium border ${getRiskColor(assessment.level)}`}>
          {assessment.level === 'high' ? 'Высокий риск' : 
           assessment.level === 'medium' ? 'Средний риск' : 'Низкий риск'}
        </span>
      </div>

      {/* Индикатор прогресса */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Индекс риска</span>
          <span className="font-semibold">{assessment.overallScore}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${getProgressColor(assessment.overallScore)}`}
            style={{ width: `${assessment.overallScore}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Безопасно</span>
          <span>Опасно</span>
        </div>
      </div>

      {/* Предупреждения */}
      {assessment.warnings.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-900 mb-2">Обнаруженные угрозы:</h4>
          <ul className="space-y-1">
            {assessment.warnings.map((warning, index) => (
              <li key={index} className="flex items-start text-sm">
                <span className="text-red-500 mr-2">⚠</span>
                <span className="text-gray-700">{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {assessment.details.length}
          </div>
          <div className="text-blue-800">Категорий</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {assessment.details.reduce((acc, cat) => acc + cat.fields.length, 0)}
          </div>
          <div className="text-green-800">ПолеЙ</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {assessment.warnings.length}
          </div>
          <div className="text-red-800">Предупреждений</div>
        </div>
      </div>
    </div>
  );
};

export default RiskAssessment;
