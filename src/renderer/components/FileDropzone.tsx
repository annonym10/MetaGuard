import React, { useCallback, useState } from 'react';

interface FileDropzoneProps {
  onFilesSelected: (files: string[]) => void;
  disabled?: boolean;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onFilesSelected, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files: string[] = [];
    for (const item of Array.from(e.dataTransfer.items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file.path);
        }
      }
    }

    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [disabled, onFilesSelected]);

  const handleClick = useCallback(async () => {
    if (disabled) return;

    // В Electron используем API для выбора файлов
    if (window.api.selectDirectory) {
      const result = await window.api.selectDirectory();
      if (result) {
        onFilesSelected([result]);
      }
    }
  }, [disabled, onFilesSelected]);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragging 
          ? 'border-blue-500 bg-blue-50 drag-active' 
          : 'border-gray-300 hover:border-gray-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-medium text-gray-700">
            {isDragging ? 'Отпустите файлы здесь' : 'Перетащите файлы или нажмите для выбора'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Поддерживаются: JPEG, PNG, PDF, DOCX (максимум 100 файлов)
          </p>
        </div>
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span className="px-2 py-1 bg-gray-100 rounded">JPG</span>
          <span className="px-2 py-1 bg-gray-100 rounded">PNG</span>
          <span className="px-2 py-1 bg-gray-100 rounded">PDF</span>
          <span className="px-2 py-1 bg-gray-100 rounded">DOCX</span>
        </div>
      </div>
    </div>
  );
};

export default FileDropzone;
