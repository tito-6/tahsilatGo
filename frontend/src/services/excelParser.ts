import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { RawPaymentData } from '../types/payment.types';

export interface ExcelRow {
  [key: string]: any;
}

export class ExcelParser {
  private static readonly COLUMN_MAPPINGS = {
    // Real Excel column names
    'Müşteri Adı Soyadı': 'musteri_adi_soyadi',
    'Tarih': 'tarih',
    'Tahsilat Şekli': 'tahsilat_sekli',
    'Hesap Adı': 'hesap_adi',
    'Ödenen Döviz': 'odenen_doviz',
    'Proje Adı': 'proje_adi',
  };

  static parseFile(file: File): Promise<RawPaymentData[]> {
    const fileName = file.name.toLowerCase();
    console.log('ExcelParser.parseFile called with file:', fileName);
    
    if (fileName.endsWith('.csv')) {
      console.log('Parsing as CSV file');
      return this.parseCSVFile(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      console.log('Parsing as Excel file');
      return this.parseExcelFile(file);
    } else {
      return Promise.reject(new Error('Unsupported file type. Please use CSV, XLSX, or XLS files.'));
    }
  }

  private static parseCSVFile(file: File): Promise<RawPaymentData[]> {
    console.log('parseCSVFile called');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csvText = e.target?.result as string;
          console.log('CSV text read:', csvText.substring(0, 200) + '...');
          
          const results = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
          });
          
          try {
            console.log('CSV parsing complete, results:', results);
            if (results.errors && results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }
            
            const jsonData = results.data as ExcelRow[];
            console.log('CSV data parsed:', jsonData);
            const payments = this.parseJsonData(jsonData);
            console.log('Payments parsed:', payments);
            resolve(payments);
          } catch (error) {
            console.error('CSV parsing error:', error);
            reject(new Error(`Failed to parse CSV file: ${error}`));
          }
        } catch (error) {
          console.error('CSV file reading error:', error);
          reject(new Error(`Failed to read CSV file: ${error}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read CSV file'));
      };
      
      reader.readAsText(file);
    });
  }

  private static parseExcelFile(file: File): Promise<RawPaymentData[]> {
    console.log('parseExcelFile called');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          console.log('Excel file read successfully');
          const data = e.target?.result;
          
          if (!data) {
            throw new Error('No data read from file');
          }
          
          // Validate file size
          if (data instanceof ArrayBuffer && data.byteLength === 0) {
            throw new Error('File is empty');
          }
          
          const fileExtension = file.name.toLowerCase().split('.').pop();
          console.log('File extension:', fileExtension);
          
          let jsonData: ExcelRow[] = [];
          
          if (fileExtension === 'xlsx') {
            // Use ExcelJS for .xlsx files
            console.log('Parsing .xlsx file with ExcelJS');
            jsonData = await this.parseXlsxWithExcelJS(data as ArrayBuffer);
          } else if (fileExtension === 'xls') {
            // Use XLSX for .xls files
            console.log('Parsing .xls file with XLSX');
            jsonData = await this.parseXlsWithXLSX(data as ArrayBuffer);
          } else {
            throw new Error('Unsupported Excel file format. Please use .xlsx or .xls files.');
          }
          
          console.log('Excel data parsed:', jsonData);
          if (jsonData.length === 0) {
            throw new Error('No data found in worksheet. Please ensure the Excel file contains data rows.');
          }
          
          const payments = this.parseJsonData(jsonData);
          console.log('Payments parsed:', payments);
          resolve(payments);
        } catch (error) {
          console.error('Excel parsing error:', error);
          reject(new Error(`Failed to parse Excel file: ${error}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  private static async parseXlsxWithExcelJS(buffer: ArrayBuffer): Promise<ExcelRow[]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('No worksheet found in the Excel file');
      }
      
      console.log('Processing .xlsx worksheet rows');
      const jsonData: ExcelRow[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const rowData: ExcelRow = {};
        row.eachCell((cell, colNumber) => {
          const headerCell = worksheet.getCell(1, colNumber);
          const header = headerCell.value?.toString() || `Column${colNumber}`;
          rowData[header] = cell.value;
        });
        
        if (Object.keys(rowData).length > 0) {
          jsonData.push(rowData);
        }
      });
      
      return jsonData;
    } catch (excelError) {
      console.error('ExcelJS load error:', excelError);
      
      // Check if it's a file format issue
      const errorMessage = excelError instanceof Error ? excelError.message : String(excelError);
      
      if (errorMessage.includes('zip file') || errorMessage.includes('central directory')) {
        throw new Error('Invalid .xlsx file format. Please ensure the file is not corrupted.');
      } else if (errorMessage.includes('password')) {
        throw new Error('Password-protected Excel files are not supported.');
      } else {
        throw new Error(`Excel file format error: ${errorMessage}`);
      }
    }
  }

  private static async parseXlsWithXLSX(buffer: ArrayBuffer): Promise<ExcelRow[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No worksheets found in the .xls file');
      }
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error('Worksheet not found in the .xls file');
      }
      
      console.log('Processing .xls worksheet with XLSX');
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
      
      return jsonData;
    } catch (xlsxError) {
      console.error('XLSX load error:', xlsxError);
      
      const errorMessage = xlsxError instanceof Error ? xlsxError.message : String(xlsxError);
      throw new Error(`Failed to parse .xls file: ${errorMessage}`);
    }
  }

  private static parseJsonData(jsonData: ExcelRow[]): RawPaymentData[] {
    const payments: RawPaymentData[] = [];
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      try {
        const payment = this.parseRow(row, i + 2); // +2 because Excel rows start from 1 and we skip header
        if (payment) {
          payments.push(payment);
        }
      } catch (error) {
        console.warn(`Skipping row ${i + 2}: ${error}`);
      }
    }
    
    // After parsing all payments
    console.log('DEBUG: All parsed payment dates:', payments.map(p => p.tarih));
    
    return payments;
  }

  private static parseRow(row: ExcelRow, rowNumber: number): RawPaymentData | null {
    // Debug: Show all available columns for the first few rows
    if (rowNumber <= 5) {
      console.log(`Row ${rowNumber} available columns:`, Object.keys(row));
      console.log(`Row ${rowNumber} data:`, row);
    }

    // Find the "Ödenen Tutar" column dynamically (it has Σ: in name or exact match)
    const odenenTutarKey = Object.keys(row).find(key => 
      key.startsWith('Ödenen Tutar') || key.includes('Ödenen Tutar') || key === 'Ödenen Tutar'
    );

    if (!odenenTutarKey) {
      console.log('Available columns:', Object.keys(row));
      throw new Error('Ödenen Tutar column not found. Available columns: ' + Object.keys(row).join(', '));
    }

    // Find required fields with flexible matching (trim spaces and case-insensitive)
    const findColumn = (searchFor: string): string | null => {
      const keys = Object.keys(row);
      
      // First try exact match
      if (keys.includes(searchFor)) {
        return searchFor;
      }
      
      // Then try trimmed and case-insensitive match
      const found = keys.find(key => 
        key.trim().toLowerCase() === searchFor.trim().toLowerCase()
      );
      
      if (found) {
        return found;
      }
      
      // Try partial match for common variations
      if (searchFor === 'Proje Adı') {
        const projeMatch = keys.find(key => 
          key.toLowerCase().includes('proje') || 
          key.toLowerCase().includes('project')
        );
        if (projeMatch) {
          console.log(`Found project column: "${projeMatch}" for search "${searchFor}"`);
          return projeMatch;
        }
      }
      
      return null;
    };

    // Validate required fields with flexible matching
    const requiredFields = ['Müşteri Adı Soyadı', 'Tarih', 'Tahsilat Şekli', 'Hesap Adı', 'Ödenen Döviz', 'Proje Adı'];
    const fieldMap: { [key: string]: string } = {};
    
    for (const field of requiredFields) {
      const foundColumn = findColumn(field);
      if (!foundColumn) {
        console.log(`Missing field "${field}". Available columns:`, Object.keys(row));
        throw new Error(`Missing required field: ${field}. Available columns: ${Object.keys(row).join(', ')}`);
      }
      fieldMap[field] = foundColumn;
      
      // Check if the value exists and is not empty
      if (!row[foundColumn] && row[foundColumn] !== 0) {
        throw new Error(`Missing required field: ${field} (column: ${foundColumn})`);
      }
    }

    // Parse and validate data
    const customerName = String(row['Müşteri Adı Soyadı']).trim();
    if (!customerName) {
      throw new Error('Customer name cannot be empty');
    }

    // Parse date and send original format to backend for proper handling
    const originalDateValue = row['Tarih'];
    let tarih: string;
    
    // Check if it's "DD Month YYYY" format - send as-is to backend
    if (typeof originalDateValue === 'string') {
      const trimmedDate = originalDateValue.trim();
      
      // Check for "DD Month YYYY" pattern
      const monthPattern = /^\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i;
      if (monthPattern.test(trimmedDate)) {
        tarih = trimmedDate; // Send "DD Month YYYY" format directly to backend
        console.log(`Row ${rowNumber}: Sending "DD Month YYYY" format to backend: ${tarih}`);
      } else {
        // For other string formats, parse and convert to DD/MM/YYYY
        const parsedDate = this.parseDate(originalDateValue);
        if (!parsedDate) {
          throw new Error('Invalid or empty date');
        }
        tarih = `${parsedDate.getDate().toString().padStart(2, '0')}/${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;
        console.log(`Row ${rowNumber}: Converted to DD/MM/YYYY format: ${tarih}`);
      }
    } else {
      // For non-string dates (like Excel serials), parse and convert to DD/MM/YYYY
      const parsedDate = this.parseDate(originalDateValue);
      if (!parsedDate) {
        throw new Error('Invalid or empty date');
      }
      tarih = `${parsedDate.getDate().toString().padStart(2, '0')}/${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;
      console.log(`Row ${rowNumber}: Original date value: ${originalDateValue}, Converted to: ${tarih}`);
    }

    const amount = this.parseAmount(row[odenenTutarKey]);
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const currency = String(row['Ödenen Döviz']).trim().toUpperCase();
    if (!['TL', 'USD', 'EUR'].includes(currency)) {
      throw new Error('Invalid currency. Must be TL, USD, or EUR');
    }

    const tahsilatSekli = String(row['Tahsilat Şekli']).trim();
    if (!tahsilatSekli) {
      throw new Error('Payment method cannot be empty');
    }

    const hesapAdi = String(row['Hesap Adı']).trim();
    if (!hesapAdi) {
      throw new Error('Account name cannot be empty');
    }

    const projeAdi = String(row['Proje Adı']).trim();
    if (!projeAdi) {
      throw new Error('Project name cannot be empty');
    }

    return {
      musteri_adi_soyadi: customerName,
      tarih: tarih,
      tahsilat_sekli: tahsilatSekli,
      hesap_adi: hesapAdi,
      odenen_tutar: amount,
      odenen_doviz: currency,
      proje_adi: projeAdi,
    };
  }

  private static parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;

    // If it's already a Date object, return it
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // Handle different date formats
    const dateStr = String(dateValue).trim();
    
    // NEW: Handle "DD Month YYYY" format (like "31 January 2025")
    const monthNames = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    
    const monthPattern = /^(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})$/i;
    const monthMatch = dateStr.match(monthPattern);
    if (monthMatch) {
      const day = parseInt(monthMatch[1], 10);
      const monthName = monthMatch[2].toLowerCase();
      const year = parseInt(monthMatch[3], 10);
      
      if (monthNames.hasOwnProperty(monthName)) {
        const month = monthNames[monthName as keyof typeof monthNames];
        const date = new Date(year, month, day);
        console.log(`✅ Parsed "DD Month YYYY" date: ${dateStr} -> ${date.toLocaleDateString('en-GB')}`);
        return date;
      }
    }
    
    // Try DD/MM/YYYY format (prioritize text dates from Excel)
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10);
      const year = parseInt(ddmmyyyy[3], 10);
      const date = new Date(year, month - 1, day);
      console.log(`✅ Parsed DD/MM/YYYY date: ${dateStr} -> ${date.toLocaleDateString('en-GB')}`);
      return date;
    }

    // Try YYYY-MM-DD format
    const yyyymmdd = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10);
      const day = parseInt(yyyymmdd[3], 10);
      const date = new Date(year, month - 1, day);
      console.log(`✅ Parsed YYYY-MM-DD date: ${dateStr} -> ${date.toLocaleDateString('en-GB')}`);
      return date;
    }

    // Try parsing as Excel serial number (only if it's a number and looks like Excel serial)
    if (typeof dateValue === 'number' && dateValue > 1 && dateValue < 100000) {
      // Excel date serial number - use more accurate conversion
      // Excel starts from 1900-01-01, but has a leap year bug for 1900
      const excelEpoch = new Date(1900, 0, 1);
      let days = Math.floor(dateValue) - 1; // Excel starts from 1, not 0
      
      // Adjust for Excel's 1900 leap year bug
      if (dateValue > 59) {
        days = days - 1;
      }
      
      const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
      
      // Add fractional day (time portion)
      const fractionalDay = dateValue - Math.floor(dateValue);
      const millisInDay = fractionalDay * 24 * 60 * 60 * 1000;
      date.setTime(date.getTime() + millisInDay);
      
      console.log(`✅ Parsed Excel serial: ${dateValue} -> ${date.toLocaleDateString('en-GB')}`);
      return date;
    }

    // Try parsing as Date string
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      console.log(`✅ Parsed generic date: ${dateStr} -> ${date.toLocaleDateString('en-GB')}`);
      return date;
    }

    console.warn(`❌ Could not parse date: ${dateValue} (${typeof dateValue})`);
    return null;
  }

  private static parseAmount(amountValue: any): number {
    if (typeof amountValue === 'number') {
      return amountValue;
    }

    const amountStr = String(amountValue).trim();
    
    // Remove currency symbols and spaces
    const cleaned = amountStr
      .replace(/[₺$€,\s]/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.');

    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
  }

  static validateFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: 'Please select a valid Excel (.xlsx, .xls) or CSV file',
      };
    }

    if (file.size === 0) {
      return {
        valid: false,
        error: 'File is empty. Please select a file with content.',
      };
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return {
        valid: false,
        error: 'File size must be less than 10MB',
      };
    }

    // Additional validation for Excel files
    if (fileExtension === '.xlsx' && file.size < 1000) {
      return {
        valid: false,
        error: 'File appears to be too small to be a valid Excel file. Please check if the file is corrupted.',
      };
    }

    return { valid: true };
  }
}
