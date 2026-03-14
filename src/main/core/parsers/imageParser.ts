import sharp from 'sharp';
import exifr from 'exifr';
import { FileMetadata, MetadataCategory, MetadataField } from '../../../types';
import path from 'path';

export const imageParser = {
  async extract(filePath: string): Promise<FileMetadata> {
    const categories: MetadataCategory[] = [];
    
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();
      
      const exifData = await exifr.parse(filePath, {
        iptc: true,
        xmp: true,
        gps: true,
        mergeOutput: false,
      });

      const basicFields: MetadataField[] = [
        { key: 'Формат', value: metadata.format || 'unknown', risk: 'low', removable: false },
        { key: 'Размер', value: `${metadata.width}x${metadata.height}`, risk: 'low', removable: false },
        { key: 'Глубина цвета', value: metadata.depth || 'unknown', risk: 'low', removable: false },
      ];
      
      if (basicFields.length > 0) {
        categories.push({
          name: 'Основная информация',
          risk: 'low',
          fields: basicFields,
        });
      }

      if (exifData) {
        const exifFields: MetadataField[] = [];
        
        if (exifData.latitude && exifData.longitude) {
          exifFields.push({
            key: 'GPS Координаты',
            value: `${exifData.latitude}, ${exifData.longitude}`,
            risk: 'high',
            removable: true,
          });
        }
        
        if (exifData.DateTimeOriginal) {
          exifFields.push({
            key: 'Дата съемки',
            value: exifData.DateTimeOriginal.toLocaleString(),
            risk: 'medium',
            removable: true,
          });
        }
        
        if (exifData.Make || exifData.Model) {
          exifFields.push({
            key: 'Камера',
            value: `${exifData.Make || ''} ${exifData.Model || ''}`.trim(),
            risk: 'medium',
            removable: true,
          });
        }
        
        if (exifData.ExposureTime) {
          exifFields.push({
            key: 'Выдержка',
            value: exifData.ExposureTime.toString(),
            risk: 'low',
            removable: true,
          });
        }
        
        if (exifFields.length > 0) {
          categories.push({
            name: 'EXIF данные',
            risk: exifFields.some(f => f.risk === 'high') ? 'high' : 'medium',
            fields: exifFields,
          });
        }
      }

      if (exifData?.iptc) {
        const iptcFields: MetadataField[] = [];
        
        if (exifData.iptc.Byline) {
          iptcFields.push({
            key: 'Автор',
            value: exifData.iptc.Byline,
            risk: 'high',
            removable: true,
          });
        }
        
        if (exifData.iptc.CopyrightNotice) {
          iptcFields.push({
            key: 'Авторские права',
            value: exifData.iptc.CopyrightNotice,
            risk: 'low',
            removable: false,
          });
        }
        
        if (exifData.iptc.Keywords) {
          iptcFields.push({
            key: 'Ключевые слова',
            value: Array.isArray(exifData.iptc.Keywords) 
              ? exifData.iptc.Keywords.join(', ')
              : exifData.iptc.Keywords,
            risk: 'medium',
            removable: true,
          });
        }
        
        if (iptcFields.length > 0) {
          categories.push({
            name: 'IPTC данные',
            risk: 'medium',
            fields: iptcFields,
          });
        }
      }

      if (exifData?.xmp) {
        const xmpFields: MetadataField[] = [];
        
        Object.entries(exifData.xmp).forEach(([key, value]) => {
          if (typeof value === 'string' && value.trim()) {
            xmpFields.push({
              key,
              value,
              risk: this.assessXmpRisk(key),
              removable: true,
            });
          }
        });
        
        if (xmpFields.length > 0) {
          categories.push({
            name: 'XMP данные',
            risk: xmpFields.some(f => f.risk === 'high') ? 'high' : 'medium',
            fields: xmpFields,
          });
        }
      }

    } catch (error) {
      console.error('Ошибка парсинга изображения:', error);
      categories.push({
        name: 'Ошибка',
        risk: 'low',
        fields: [{
          key: 'Ошибка',
          value: 'Не удалось извлечь метаданные',
          risk: 'low',
          removable: false,
        }],
      });
    }

    return {
      format: path.extname(filePath).toUpperCase().slice(1),
      size: 0,
      categories,
      raw: {},
    };
  },

  private assessXmpRisk(key: string): 'low' | 'medium' | 'high' {
    const highRiskKeys = [
      'creator', 'authorsposition', 'location', 'city', 'state', 'country',
      'email', 'website', 'phone', 'address',
    ];
    
    const mediumRiskKeys = [
      'description', 'title', 'subject', 'instructions', 'source',
    ];
    
    const keyLower = key.toLowerCase();
    
    if (highRiskKeys.some(k => keyLower.includes(k))) return 'high';
    if (mediumRiskKeys.some(k => keyLower.includes(k))) return 'medium';
    return 'low';
  }
};
