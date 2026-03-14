// Основные типы данных приложения
export interface MetadataField {
  key: string;
  value: string | number | boolean;
  risk: 'low' | 'medium' | 'high';
  removable: boolean;
}

export interface MetadataCategory {
  name: string;
  risk: 'low' | 'medium' | 'high';
  fields: MetadataField[];
}

export interface FileMetadata {
  format: string;
  size: number;
  categories: MetadataCategory[];
  raw: Record<string, any>;
}

export interface RiskAssessment {
  overallScore: number;
  level: 'low' | 'medium' | 'high';
  warnings: string[];
  details: MetadataCategory[];
}

export interface AnalysisResult {
  metadata: FileMetadata;
  riskAssessment: RiskAssessment;
  filePath: string;
  fileName: string;
}

export interface ProcessResult {
  filePath: string;
  success: boolean;
  error?: string;
  originalMetadata?: FileMetadata;
  riskScore?: number;
  integrityChecked?: boolean;
  outputPath?: string;
}

export interface CleaningProfile {
  id: string;
  name: string;
  description: string;
  rules: {
    removeGPS: boolean;
    removeAuthors: boolean;
    removeSoftwareInfo: boolean;
    removePaths: boolean;
    removeTimestamps: boolean;
    preserveCopyright: boolean;
  };
}

export interface AppSettings {
  language: 'ru' | 'en';
  theme: 'light' | 'dark' | 'system';
  autoBackup: boolean;
  secureDelete: boolean;
  defaultProfile: string;
  batchLimit: number;
}
