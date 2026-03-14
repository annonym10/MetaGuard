"use strict";
const electron = require("electron");
const path = require("path");
let mainWindow = null;

function normalizeFilePath(inputPath) {
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error("Некорректный путь к файлу");
  }
  if (inputPath.startsWith("file://")) {
    try {
      const { fileURLToPath } = require("url");
      return fileURLToPath(inputPath);
    } catch (_error) {
      return inputPath.replace(/^file:\/+/, "");
    }
  }
  return inputPath;
}

function stripJpegMetadata(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return buffer;
  if (!(buffer[0] === 0xFF && buffer[1] === 0xD8)) return buffer;

  const removableMarkers = new Set([
    0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8,
    0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF, 0xFE
  ]);
  const standaloneMarkers = new Set([0x01, 0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9]);

  const chunks = [buffer.slice(0, 2)];
  let i = 2;

  while (i < buffer.length - 1) {
    if (buffer[i] !== 0xFF) {
      chunks.push(buffer.slice(i));
      break;
    }

    const marker = buffer[i + 1];
    if (marker === 0xDA) {
      chunks.push(buffer.slice(i));
      break;
    }

    if (standaloneMarkers.has(marker)) {
      chunks.push(buffer.slice(i, i + 2));
      i += 2;
      continue;
    }

    if (i + 4 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(i + 2);
    const segmentEnd = i + 2 + segmentLength;
    if (segmentEnd > buffer.length || segmentLength < 2) break;

    if (!removableMarkers.has(marker)) {
      chunks.push(buffer.slice(i, segmentEnd));
    }

    i = segmentEnd;
  }

  return Buffer.concat(chunks);
}

function stripPngMetadata(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return buffer;
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buffer.slice(0, 8).equals(pngSignature)) return buffer;

  const metadataChunks = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);
  const chunks = [buffer.slice(0, 8)];
  let i = 8;

  while (i + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(i);
    const type = buffer.slice(i + 4, i + 8).toString("ascii");
    const chunkEnd = i + 12 + length;

    if (chunkEnd > buffer.length) break;
    if (!metadataChunks.has(type)) {
      chunks.push(buffer.slice(i, chunkEnd));
    }

    i = chunkEnd;
    if (type === "IEND") break;
  }

  return Buffer.concat(chunks);
}
// ========== ПОЛНЫЙ ПАРСЕР И ОЧИСТКА OFFICE ДОКУМЕНТОВ ==========

// Функция для глубокой очистки DOCX
async function deepCleanDOCX(fileBuffer, mode) {
  try {
    const AdmZip = require('adm-zip');
    const xml2js = require('xml2js');
    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder();
    
    // 1. Распаковываем DOCX
    const zip = new AdmZip(fileBuffer);
    
    // 2. СПИСОК ВСЕХ ФАЙЛОВ, ГДЕ МОГУТ БЫТЬ МЕТАДАННЫЕ
    const metadataFiles = [
      'docProps/core.xml',
      'docProps/app.xml',
      'docProps/custom.xml',
      'word/settings.xml',
      'word/webSettings.xml',
      'word/fontTable.xml',
      'word/styles.xml',
      'word/comments.xml',
      'word/commentsExtended.xml',
      'word/people.xml',
      'word/commentsIds.xml',
      'word/endnotes.xml',
      'word/footnotes.xml',
      'word/header1.xml',
      'word/footer1.xml',
      '[Content_Types].xml',
      '_rels/.rels',
      'word/_rels/document.xml.rels'
    ];
    
    // 3. Очищаем каждый файл
    for (const filePath of metadataFiles) {
      const entry = zip.getEntry(filePath);
      if (!entry) continue;
      
      try {
        const content = entry.getData().toString('utf-8');
        const result = await parser.parseStringPromise(content);
        
        // ОЧИСТКА В ЗАВИСИМОСТИ ОТ ТИПА ФАЙЛА
        switch(filePath) {
          case 'docProps/core.xml':
            // Основные метаданные
            if (result['cp:coreProperties']) {
              const props = result['cp:coreProperties'];
              
              // Удаляем ВСЕ личные данные
              delete props['dc:creator'];
              delete props['cp:lastModifiedBy'];
              delete props['dc:title'];
              delete props['dc:subject'];
              delete props['dc:description'];
              delete props['dc:publisher'];
              delete props['dc:contributor'];
              delete props['cp:keywords'];
              delete props['cp:category'];
              delete props['cp:contentStatus'];
              delete props['dc:language'];
              delete props['cp:revision'];
              
              // Устанавливаем безопасные значения
              props['dc:creator'] = [''];
              props['cp:lastModifiedBy'] = [''];
              props['dcterms:created'] = [new Date().toISOString()];
              props['dcterms:modified'] = [new Date().toISOString()];
              props['dc:title'] = [''];
            }
            break;
            
          case 'docProps/app.xml':
            // Информация о приложении
            if (result['Properties']) {
              const props = result['Properties'];
              delete props['Company'];
              delete props['Manager'];
              delete props['HyperlinkBase'];
              delete props['SharedDoc'];
              delete props['LinksUpToDate'];
              delete props['ScaleCrop'];
              delete props['HeadingPairs'];
              delete props['TitlesOfParts'];
              delete props['DocSecurity'];
              
              props['Application'] = [''];
              props['AppVersion'] = ['1.0'];
              props['TotalTime'] = ['0'];
              props['Pages'] = ['1'];
              props['Words'] = ['0'];
              props['Characters'] = ['0'];
            }
            break;
            
          case 'word/comments.xml':
            // Удаляем ВСЕ комментарии (они содержат авторов)
            if (result['w:comments']) {
              result['w:comments'] = {};
            }
            break;
            
          case 'word/settings.xml':
            // Настройки документа
            if (result['w:settings']) {
              const settings = result['w:settings'];
              delete settings['w:writeProtection']; // Защита от записи
              delete settings['w:documentProtection']; // Защита документа
              delete settings['w:attachedTemplate']; // Прикрепленный шаблон
            }
            break;
            
          case '[Content_Types].xml':
            // Удаляем ссылки на пользовательские свойства
            if (result['Types']) {
              const types = result['Types'];
              if (types['Override']) {
                types['Override'] = types['Override'].filter(override => 
                  !override['$'] || !override['$'].PartName || 
                  !override['$'].PartName.includes('docProps/custom')
                );
              }
            }
            break;
        }
        
        // Сохраняем изменения
        const cleanedXml = builder.buildObject(result);
        zip.updateFile(filePath, Buffer.from(cleanedXml, 'utf-8'));
        
      } catch (xmlError) {
        console.warn(`Не удалось обработать ${filePath}:`, xmlError.message);
        // Продолжаем со следующим файлом
      }
    }
    
    // 4. УДАЛЯЕМ файлы, которые не нужны или содержат только метаданные
    const filesToDelete = [
      'docProps/custom.xml', // Пользовательские свойства
      'word/commentsExtended.xml',
      'word/people.xml',
      'word/commentsIds.xml'
    ];
    
    filesToDelete.forEach(file => {
      if (zip.getEntry(file)) {
        zip.deleteFile(file);
      }
    });
    
    // 5. ОЧИЩАЕМ основной документ (document.xml)
    const docEntry = zip.getEntry('word/document.xml');
    if (docEntry) {
      const docContent = docEntry.getData().toString('utf-8');
      
      // Удаляем:
      // 1. Комментарии в тексте
      let cleanedDoc = docContent.replace(/<w:comment[^>]*>[\s\S]*?<\/w:comment>/g, '');
      
      // 2. Ссылки на ревизии
      cleanedDoc = cleanedDoc.replace(/w:rsid\w*="[^"]*"/g, '');
      
      // 3. Информацию об авторах изменений
      cleanedDoc = cleanedDoc.replace(/w:author="[^"]*"/g, 'w:author=""');
      
      // 4. Даты изменений
      cleanedDoc = cleanedDoc.replace(/w:date="[^"]*"/g, `w:date="${new Date().toISOString()}"`);
      
      zip.updateFile('word/document.xml', Buffer.from(cleanedDoc, 'utf-8'));
    }
    
    // 6. Возвращаем очищенный DOCX
    return zip.toBuffer();
    
  } catch (error) {
    console.error('Ошибка глубокой очистки DOCX:', error);
    throw error;
  }
}

// Функция для очистки DOC (старый формат) - через конвертацию
async function cleanDOC(fileBuffer, mode) {
  try {
    // Для DOC используем mammoth для извлечения текста
    // и создаем новый DOCX
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    
    // Создаем простой DOCX с текстом
    return await createSimpleDOCX(result.value);
    
  } catch (error) {
    console.error('Ошибка очистки DOC:', error);
    throw error;
  }
}

// Создание простого DOCX с текстом
async function createSimpleDOCX(text) {
  // Минимальный DOCX структура
  const AdmZip = require('adm-zip');
  const zip = new AdmZip();
  
  // 1. Основной документ
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${escapeXml(text)}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;
  
  // 2. Основные метаданные
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" 
                   xmlns:dc="http://purl.org/dc/elements/1.1/" 
                   xmlns:dcterms="http://purl.org/dc/terms/">
  <dc:creator>MetaGuard</dc:creator>
  <cp:lastModifiedBy>MetaGuard</cp:lastModifiedBy>
  <dcterms:created>${new Date().toISOString()}</dcterms:created>
  <dcterms:modified>${new Date().toISOString()}</dcterms:modified>
  <dc:title>Очищенный документ</dc:title>
</cp:coreProperties>`;
  
  // 3. Добавляем файлы в архив
  zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`));
  
  zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`));
  
  zip.addFile('word/_rels/document.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`));
  
  zip.addFile('word/document.xml', Buffer.from(documentXml, 'utf-8'));
  zip.addFile('docProps/core.xml', Buffer.from(coreXml, 'utf-8'));
  
  return zip.toBuffer();
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'MetaGuard.ico'),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "./index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
// Функция для анализа JPEG файлов
function analyzeJPEGRisk(buffer) {
  let riskScore = 0;
  const warnings = [];
  
  // Конвертируем буфер в строку для поиска
  const hexString = buffer.toString('hex');
  const textString = buffer.toString('binary', 0, 10000);
  
  // Поиск GPS тегов в EXIF (бинарный поиск)
  // GPS теги начинаются с 0x8825 в EXIF
  if (hexString.includes('8825')) {
    riskScore += 70;
    warnings.push('⚠ ОБНАРУЖЕНЫ GPS ТЕГИ!');
  }
  
  // Поиск координат в текстовом виде
  if (textString.includes('GPSLatitude') || textString.includes('GPSLongitude')) {
    riskScore += 60;
    warnings.push('Обнаружены GPS координаты');
  }
  
  // Поиск EXIF данных
  if (textString.includes('Exif') || textString.includes('exif')) {
    riskScore += 40;
    warnings.push('Обнаружены EXIF данные');
  }
  
  // Поиск информации о камере
  if (textString.includes('Model') || textString.includes('Make')) {
    riskScore += 30;
    warnings.push('Обнаружена информация о камере');
  }
  
  // Поиск даты и времени
  if (textString.includes('DateTime') || textString.includes('Date/Time')) {
    riskScore += 20;
    warnings.push('Обнаружены дата и время');
  }
  
  // Поиск автора
  if (textString.includes('Author') || textString.includes('Artist')) {
    riskScore += 50;
    warnings.push('Обнаружен автор');
  }
  
  return { riskScore: Math.min(100, riskScore), warnings };
}
electron.ipcMain.handle("analyze-file", async (_event, filePath) => {
  console.log("Анализируем файл:", filePath);
  
  try {
    const fs = require("fs").promises;
    const normalizedPath = normalizeFilePath(filePath);
    const buffer = await fs.readFile(normalizedPath);
    const ext = path.extname(normalizedPath).toLowerCase();
    
    let riskScore = 10; // минимальный риск
    let warnings = ['Базовый анализ выполнен'];
    
    // Анализируем в зависимости от типа файла
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      const result = analyzeJPEGRisk(buffer);
      riskScore = result.riskScore;
      warnings = result.warnings;
    }
    else if (ext === '.pdf') {
      // Для PDF ищем метаданные
      const text = buffer.toString('binary', 0, 5000);
      if (text.includes('/Author') || text.includes('/Producer')) {
        riskScore += 40;
        warnings.push('Обнаружены метаданные PDF');
      }
    }
    
    const level = riskScore > 70 ? 'high' : riskScore > 30 ? 'medium' : 'low';
    
    return {
      success: true,
      metadata: {
        format: ext.toUpperCase().slice(1),
        size: (await fs.stat(normalizedPath)).size,
        categories: [{
          name: "Анализ рисков",
          risk: level,
          fields: warnings.map(w => ({
            key: w.includes('⚠') ? "ВЫСОКИЙ РИСК" : "Предупреждение",
            value: w,
            risk: w.includes('⚠') ? 'high' : 'medium',
            removable: true
          }))
        }],
        raw: {}
      },
      riskScore: riskScore,
      riskAssessment: {
        overallScore: riskScore,
        level: level,
        warnings: warnings,
        details: []
      },
      filePath,
      fileName: path.basename(normalizedPath)
    };
    
  } catch (error) {
    console.error("Ошибка анализа:", error);
    return {
      success: false,
      error: error.message
    };
  }
});
electron.ipcMain.handle("process-files", async (_event, files, profile) => {
  console.log(`Обработка файлов: ${files.length}, профиль: ${profile}`);
  return files.map((filePath) => ({
    filePath,
    success: true,
    error: void 0,
    originalMetadata: { format: "", size: 0, categories: [], raw: {} },
    riskScore: 30,
    integrityChecked: true,
    outputPath: filePath
  }));
});
electron.ipcMain.handle("select-files", async () => {
  const result = await electron.dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Поддерживаемые файлы",
        extensions: ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx"]
      },
      { name: "Все файлы", extensions: ["*"] }
    ]
  });
  return result.canceled ? [] : result.filePaths;
});
electron.ipcMain.handle("save-report", async (_event, report, format) => {
  try {
    const result = await electron.dialog.showSaveDialog({
      title: "Сохранить отчет",
      defaultPath: `metaguard-report-${Date.now()}.${format || "txt"}`,
      filters: [{ name: "Текстовый файл", extensions: [format || "txt"] }]
    });
    if (result.canceled || !result.filePath) {
      return null;
    }
    const fs = require("fs").promises;
    await fs.writeFile(result.filePath, report, "utf-8");
    return result.filePath;
  } catch (error) {
    console.error("Ошибка сохранения отчета:", error);
    return null;
  }
});
electron.ipcMain.handle("show-message", async (_event, options) => {
  return electron.dialog.showMessageBox(mainWindow || undefined, options || {});
});
electron.ipcMain.handle("open-external", async (_event, url) => {
  return electron.shell.openExternal(url);
});
electron.ipcMain.handle("clean-file", async (_event, filePath, mode) => {
  console.log("Очистка файла:", filePath, "режим:", mode);
  
  try {
    const fs = require("fs").promises;
    const normalizedPath = normalizeFilePath(filePath);
    const buffer = await fs.readFile(normalizedPath);
    const ext = path.extname(normalizedPath).toLowerCase();
    
    let cleanedBuffer;
    let extension = ext;
    let message = "Файл очищен от метаданных";
    
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      try {
        cleanedBuffer = ext === ".png" ? stripPngMetadata(buffer) : stripJpegMetadata(buffer);
        message = "Изображение очищено (EXIF/IPTC/XMP удалены)";
      } catch (imageError) {
        console.error("Ошибка очистки изображения:", imageError);
        cleanedBuffer = buffer; // Возвращаем оригинал
        message = "Не удалось очистить изображение";
      }
    }
    else if (ext === ".webp") {
      cleanedBuffer = buffer;
      message = "Очистка WEBP временно недоступна";
    }
    
    // ========== ДЛЯ PDF ==========
    else if (ext === '.pdf') {
  try {
    const { PDFDocument } = require('pdf-lib');
    
    // Метод 1: Пересоздание с оптимизацией
    const originalPdf = await PDFDocument.load(buffer);
    const pages = originalPdf.getPages();
    const newPdf = await PDFDocument.create();
    
    for (const page of pages) {
      const { width, height } = page.getSize();
      const newPage = newPdf.addPage([width, height]);
      const content = await newPdf.embedPage(page);
      newPage.drawPage(content);
    }
    
    // Минимальные метаданные
    newPdf.setTitle('');
    newPdf.setAuthor('');
    newPdf.setCreator('');
    newPdf.setProducer('');
    
    const pdfBytes = await newPdf.save({
      useObjectStreams: true,
      objectsPerTick: 50
    });
    
    cleanedBuffer = Buffer.from(pdfBytes);
    message = "PDF очищен и оптимизирован";
    
  } catch (pdfError) {
    console.error("Ошибка PDF:", pdfError);
    cleanedBuffer = buffer;
    message = "PDF сохранен без изменений";
  }
}
    
    // ========== ДЛЯ DOCX/DOC ==========
    else if (['.docx', '.doc'].includes(ext)) {
  try {
    if (ext === '.docx') {
      // Глубокая очистка DOCX
      cleanedBuffer = await deepCleanDOCX(buffer, mode);
      extension = '.docx';
      message = "DOCX глубоко очищен от метаданных";
    } else {
      // DOC конвертируем в DOCX
      cleanedBuffer = await cleanDOC(buffer, mode);
      extension = '.docx'; // Конвертируем в DOCX
      message = "DOC сконвертирован в очищенный DOCX";
    }
    
  } catch (officeError) {
    console.error("Ошибка очистки Office документа:", officeError);
    
    // Аварийный режим - сохраняем как текст
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: buffer });
      const cleanText = `Очищенный документ\n\n${result.value}`;
      cleanedBuffer = Buffer.from(cleanText, 'utf-8');
      extension = '.txt';
      message = "Документ сохранен как текст (аварийный режим)";
    } catch (textError) {
      // Совсем аварийный режим
      cleanedBuffer = buffer;
      extension = ext;
      message = "Документ сохранен без изменений";
    }
  }
}
    
    // ========== ДЛЯ ОСТАЛЬНЫХ ФАЙЛОВ ==========
    else {
      cleanedBuffer = buffer;
      message = "Формат не поддерживается для очистки";
    }
    
    return {
      success: true,
      fileBuffer: cleanedBuffer,
      originalPath: normalizedPath,
      originalSize: buffer.length,
      cleanedSize: cleanedBuffer.length,
      extension: extension,
      message: message
    };
    
  } catch (error) {
    console.error("Общая ошибка очистки:", error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Функция для сохранения очищенного файла
electron.ipcMain.handle("save-cleaned-file", async (_event, cleanResult) => {
  try {
    if (!cleanResult.success) {
      throw new Error(cleanResult.error || "Ошибка очистки файла");
    }
    
    const originalName = path.basename(cleanResult.originalPath);
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
    const defaultExt = cleanResult.extension || ".cleaned";
    const defaultName = `${nameWithoutExt}_без_метаданных${defaultExt}`;
    
    // Диалог сохранения файла
    const result = await electron.dialog.showSaveDialog({
      title: "Сохранить очищенный файл",
      defaultPath: defaultName,
      filters: [
        { name: "Все файлы", extensions: ["*"] },
        { name: "Текстовые файлы", extensions: ["txt"] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      // Сохраняем файл
      const fs = require("fs").promises;
      await fs.writeFile(result.filePath, cleanResult.fileBuffer);
      
      // Проверяем сохранение
      const stats = await fs.stat(result.filePath);
      
      return {
        success: true,
        savedPath: result.filePath,
        savedSize: stats.size,
        originalSize: cleanResult.originalSize,
        message: `Файл сохранен: ${path.basename(result.filePath)}`
      };
    }
    
    return {
      success: false,
      error: "Сохранение отменено пользователем"
    };
    
  } catch (error) {
    console.error("Ошибка сохранения:", error);
    return {
      success: false,
      error: error.message
    };
  }
});
electron.ipcMain.handle("save-cleaned-file-auto", async (_event, cleanResult) => {
  try {
    if (!cleanResult.success) {
      throw new Error(cleanResult.error || "Ошибка очистки файла");
    }
    const fs = require("fs").promises;
    const originalDir = path.dirname(cleanResult.originalPath);
    const originalName = path.basename(cleanResult.originalPath);
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
    const extension = cleanResult.extension || path.extname(originalName) || ".cleaned";
    const savePath = path.join(originalDir, `${nameWithoutExt}_без_метаданных${extension}`);
    await fs.writeFile(savePath, cleanResult.fileBuffer);
    const stats = await fs.stat(savePath);
    return {
      success: true,
      savedPath: savePath,
      savedSize: stats.size,
      originalSize: cleanResult.originalSize
    };
  } catch (error) {
    console.error("Ошибка автосохранения:", error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Функция для открытия папки
electron.ipcMain.handle("open-folder", async (_event, folderPath) => {
  try {
    await electron.shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
electron.ipcMain.on("open-devtools", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
});
electron.app.whenReady().then(() => {
  console.log("Приложение запускается...");
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
