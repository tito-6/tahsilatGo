import axios from 'axios';
import { 
  RawPaymentData, 
  UploadRequest, 
  UploadResponse, 
  PaymentRecord, 
  ReportsResponse,
  YearlyReport
} from '../types/payment.types';

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

  // Get yearly report
  getYearlyReport: async (year: number): Promise<YearlyReport> => {
    const response = await api.get<YearlyReport>(`/reports/yearly/${year}`);
    return response.data;
  },

  // Clear all payments
  clearAllPayments: async (): Promise<{ message: string; cleared: number }> => {
    const response = await api.delete<{ message: string; cleared: number }>('/payments');
    return response.data;
  },

  // Delete individual payment
  deletePayment: async (paymentId: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/payments/${paymentId}`);
    return response.data;
  },

  // Export Excel
  exportExcel: async (): Promise<Blob> => {
    const response = await api.get('/export/excel', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Export Yearly Excel
  exportYearlyExcel: async (year: number): Promise<Blob> => {
    const response = await api.get(`/export/yearly/excel/${year}`, {
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
