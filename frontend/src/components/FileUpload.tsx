import React, { useState, useCallback } from 'react';
import { ExcelParser } from '../services/excelParser';
import { paymentAPI } from '../services/api';
import { RawPaymentData, UploadResponse } from '../types/payment.types';
import { formatFileSize } from '../utils/formatters';

interface FileUploadProps {
  onUploadSuccess: (response: UploadResponse) => void;
  onUploadError: (error: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file
    const validation = ExcelParser.validateFile(file);
    if (!validation.valid) {
      onUploadError(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Parse Excel file
      setUploadProgress(25);
      console.log('Parsing file:', file.name, 'Size:', file.size);
      const rawPayments = await ExcelParser.parseFile(file);
      
      console.log('Parsed payments:', rawPayments.length);
      console.log('Sample parsed data:', rawPayments.slice(0, 3));
      
      if (rawPayments.length === 0) {
        throw new Error('No valid payment records found in the file');
      }

      setUploadProgress(50);

      // Upload to backend
      const response = await paymentAPI.uploadPayments(rawPayments);
      
      setUploadProgress(100);
      
      console.log('Upload response:', response);
      
      if (response.success) {
        // Show detailed success message
        let successMessage = response.message;
        if (response.errors && response.errors.length > 0) {
          successMessage += `\n\nWarnings/Errors encountered:\n${response.errors.join('\n')}`;
        }
        onUploadSuccess({
          ...response,
          message: successMessage
        });
      } else {
        let errorMessage = response.message || 'Upload failed';
        if (response.errors && response.errors.length > 0) {
          errorMessage += `\n\nDetails:\n${response.errors.join('\n')}`;
        }
        onUploadError(errorMessage);
      }
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
    }
  }, [onUploadSuccess, onUploadError]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Dosya Yükleme
        </h2>
        <p className="text-gray-600">
          Excel (.xlsx, .xls) veya CSV dosyasını yükleyerek ödeme verilerini işleyin.
        </p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInputChange}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />
        
        <label
          htmlFor="file-upload"
          className={`cursor-pointer ${isUploading ? 'cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center">
            <svg
              className="w-12 h-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            
            <div className="text-lg font-medium text-gray-900 mb-2">
              {isUploading ? 'İşleniyor...' : 'Dosya Seçin veya Sürükleyin'}
            </div>
            
            <div className="text-sm text-gray-500 mb-4">
              Excel (.xlsx, .xls) veya CSV dosyaları desteklenir
            </div>
            
            {selectedFile && (
              <div className="text-sm text-gray-700 mb-4">
                <div className="font-medium">{selectedFile.name}</div>
                <div className="text-gray-500">{formatFileSize(selectedFile.size)}</div>
              </div>
            )}
            
            {isUploading && (
              <div className="w-full max-w-xs">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {uploadProgress}% tamamlandı
                </div>
              </div>
            )}
            
            {!isUploading && (
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Dosya Seç
              </button>
            )}
          </div>
        </label>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          Gerekli Sütunlar:
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Müşteri Adı Soyadı</li>
          <li>• Tarih - DD/MM/YYYY formatında</li>
          <li>• Tahsilat Şekli</li>
          <li>• Hesap Adı</li>
          <li>• Ödenen Tutar(Σ:...) - Sayısal değer</li>
          <li>• Ödenen Döviz - TL, USD, veya EUR</li>
          <li>• Proje Adı</li>
        </ul>
      </div>
    </div>
  );
};
