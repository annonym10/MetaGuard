import { AnalysisResult } from '../../types';

// Временная заглушка
export const analyzer = {
  async analyzeFile(filePath: string): Promise<AnalysisResult> {
    console.log(`Анализ файла: ${filePath}`);
    
    // Временные тестовые данные
    return {
      metadata: {
        format: 'TEST',
        size: 1024,
        categories: [
          {
            name: 'Тестовые данные',
            risk: 'medium' as const,
            fields: [
              { key: 'Тестовое поле', value: 'Тестовое значение', risk: 'low' as const, removable: true },
            ],
          },
        ],
        raw: {},
      },
      riskAssessment: {
        overallScore: 50,
        level: 'medium',
        warnings: ['Тестовое предупреждение'],
        details: [],
      },
      filePath,
      fileName: path.basename(filePath),
    };
  },
};

import path from 'path';
