import axios from 'axios';
import { 
  RawPaymentData, 
  UploadRequest, 
  UploadResponse, 
  PaymentRecord, 
  ReportsResponse,
  YearlyReport
} from '../types/payment.types';

// Use relative URLs in production, localhost in development
const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8080/api');

console.log('API Configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  API_BASE_URL: API_BASE_URL
});

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Authentication storage with localStorage persistence
let authCredentials: { username: string; password: string } | null = null;

// Initialize credentials from localStorage on module load
const initializeAuth = () => {
  try {
    const storedAuth = localStorage.getItem('authCredentials');
    console.log('Stored auth from localStorage:', storedAuth ? 'Found' : 'Not found');
    if (storedAuth) {
      authCredentials = JSON.parse(storedAuth);
      if (authCredentials) {
        const authString = btoa(`${authCredentials.username}:${authCredentials.password}`);
        api.defaults.headers.common['Authorization'] = `Basic ${authString}`;
        console.log('Auth credentials restored from localStorage', api.defaults.headers.common['Authorization']);
      }
    }
  } catch (error) {
    console.error('Failed to initialize auth from localStorage:', error);
    localStorage.removeItem('authCredentials');
  }
};

// Initialize auth on module load
initializeAuth();
console.log('API module loaded with auth persistence v1.1');

// Set auth credentials
export const setAuthCredentials = (username: string, password: string) => {
  authCredentials = { username, password };
  // Store in localStorage
  localStorage.setItem('authCredentials', JSON.stringify(authCredentials));
  // Set basic auth header for all requests
  const authString = btoa(`${username}:${password}`);
  api.defaults.headers.common['Authorization'] = `Basic ${authString}`;
  console.log('Auth credentials set and stored in localStorage', api.defaults.headers.common['Authorization']);
};

export const getAuthCredentials = () => authCredentials;

// Clear auth credentials
export const clearAuthCredentials = () => {
  authCredentials = null;
  localStorage.removeItem('authCredentials');
  delete api.defaults.headers.common['Authorization'];
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return authCredentials !== null && localStorage.getItem('authCredentials') !== null;
};

// Request interceptor for authentication and logging
api.interceptors.request.use(
  (config) => {
    // Ensure auth header is set if we have credentials
    if (authCredentials && !config.headers.Authorization) {
      const authString = btoa(`${authCredentials.username}:${authCredentials.password}`);
      config.headers.Authorization = `Basic ${authString}`;
      console.log('Added auth header to request:', config.url);
    } else if (config.headers.Authorization) {
      console.log('Auth header already present for request:', config.url);
    } else {
      console.log('No auth credentials available for request:', config.url);
    }
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
    
    // Handle 401 errors by clearing auth and forcing re-login
    if (error.response?.status === 401) {
      console.log('Authentication failed, clearing credentials');
      clearAuthCredentials();
      // You might want to dispatch an event or use a callback here to update UI state
    }
    
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

// Authentication API
export const authAPI = {
  // Login
  login: async (username: string, password: string): Promise<{ success: boolean; message?: string; token?: string }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/public/login`, {
        username,
        password,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  // Check authentication status
  checkAuth: async (): Promise<{ authenticated: boolean; username?: string }> => {
    const response = await api.get('/auth/check');
    return response.data;
  },
};

export default api;
