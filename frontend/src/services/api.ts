import axios from 'axios';
import { PaymentRecord, RawPaymentData, UploadRequest, UploadResponse, ReportsResponse } from '../types/payment.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const paymentAPI = {
  // Upload payment data
  uploadPayments: async (rawPayments: RawPaymentData[]): Promise<UploadResponse> => {
    const request: UploadRequest = { raw_payments: rawPayments };
    const response = await api.post<UploadResponse>('/upload', request);
    return response.data;
  },

  // Get all payments
  getPayments: async (): Promise<PaymentRecord[]> => {
    const response = await api.get<PaymentRecord[]>('/payments');
    return response.data;
  },

  // Get reports
  getReports: async (): Promise<ReportsResponse> => {
    const response = await api.get<ReportsResponse>('/reports');
    return response.data;
  },

  // Export Excel
  exportExcel: async (): Promise<Blob> => {
    const response = await api.get('/export/excel', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Export PDF
  exportPDF: async (): Promise<Blob> => {
    const response = await api.get('/export/pdf', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<{ status: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;
