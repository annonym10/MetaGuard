import { FileMetadata, RiskAssessment } from '../../../types';
import path from 'path';

export const riskScorer = {
  assess(metadata: FileMetadata, filePath: string): RiskAssessment {
    const warnings: string[] = [];
    let score = 0;
    
    // Анализируем каждую категорию
    metadata.categories.forEach(category => {
      category.fields.forEach(field => {
        switch (field.risk) {
          case 'high':
            score += 10;
            warnings.push(`Высокий риск: ${field.key}`);
            break;
          case 'medium':
            score += 5;
            break;
          case 'low':
            score += 1;
            break;
        }
      });
    });

    // Дополнительные контекстные проверки
    this.checkContextualRisks(metadata, filePath, warnings);

    // Нормализуем счет (0-100)
    score = Math.min(100, Math.max(0, score));

    return {
      overallScore: score,
      level: this.getRiskLevel(score),
      warnings,
      details: metadata.categories,
    };
  },

  private checkContextualRisks(metadata: FileMetadata, filePath: string, warnings: string[]) {
    const fileName = path.basename(filePath).toLowerCase();
    
    // Проверка на юридические документы
    const legalKeywords = [
      'договор', 'контракт', 'соглашение', 'акт', 'иск', 'заявление',
      'доверенность', 'приказ', 'распоряжение',
    ];
    
    const isLegalDoc = legalKeywords.some(keyword => fileName.includes(keyword));
    
    if (isLegalDoc) {
      // Проверяем наличие авторов в юридических документах
      const hasAuthor = metadata.categories.some(category =>
        category.fields.some(field =>
          field.key.toLowerCase().includes('автор') ||
          field.key.toLowerCase().includes('author') ||
          field.key.toLowerCase().includes('creator')
        )
      );
      
      if (hasAuthor) {
        warnings.push('Юридический документ содержит информацию об авторе');
      }
    }
    
    // Проверка на внутренние пути
    metadata.categories.forEach(category => {
      category.fields.forEach(field => {
        if (typeof field.value === 'string') {
          // Проверка на сетевые пути Windows
          if (field.value.includes('\\\\')) {
            warnings.push(`Обнаружен сетевой путь: ${field.value.substring(0, 50)}...`);
          }
          
          // Проверка на абсолютные пути
          if (field.value.includes(':\\') || field.value.startsWith('/')) {
            warnings.push(`Обнаружен абсолютный путь файловой системы`);
          }
        }
      });
    });
  },

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score < 30) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  }
};
