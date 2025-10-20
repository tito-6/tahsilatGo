import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { WeeklyReport } from './components/WeeklyReport';
import { MonthlyReport } from './components/MonthlyReport';
import { DebugPanel } from './components/DebugPanel';
import { AllPayments } from './components/AllPayments';
import { Login } from './components/Login';
import YearlyReportComponent from './components/YearlyReport';
import { paymentAPI, authAPI, setAuthCredentials, clearAuthCredentials, isAuthenticated } from './services/api';
import api from './services/api';
import { WeeklyReport as WeeklyReportType, MonthlyReport as MonthlyReportType, UploadResponse, YearlyReport, PaymentRecord } from './types/payment.types';

function App() {
  // Authentication states
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Existing states
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReportType[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReportType[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentRecord[]>([]);
  const [yearlyReport, setYearlyReport] = useState<YearlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'reports' | 'yearly' | 'payments' | 'debug'>('upload');
  const [selectedMonth, setSelectedMonth] = useState<string | 'all'>('all');
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  
  // Date range deletion states
  const [showDateRangeDelete, setShowDateRangeDelete] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState('');
  const [deleteEndDate, setDeleteEndDate] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const currentYear = new Date().getFullYear();

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        try {
          // Try to make an authenticated request to verify credentials still work
          await authAPI.checkAuth();
          setAuthenticated(true);
        } catch (error) {
          console.log('Stored credentials invalid, clearing auth');
          clearAuthCredentials();
          setAuthenticated(false);
        }
      } else {
        setAuthenticated(false);
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  // Handle login
  const handleLogin = async (credentials: { username: string; password: string }) => {
    setLoginLoading(true);
    setLoginError(null);
    
    try {
      await authAPI.login(credentials.username, credentials.password);
      // Persist credentials and mark authenticated
      setAuthCredentials(credentials.username, credentials.password);
      setAuthenticated(true);

      // Wait until axios default Authorization header is available (small race safety)
      const waitForAuthHeader = (timeout = 2000) => {
        return new Promise<boolean>((resolve) => {
          const interval = 50;
          let waited = 0;
          const t = setInterval(() => {
            // Try to read common header or top-level header
            const hdr = (api.defaults.headers as any).common?.Authorization || (api.defaults.headers as any).Authorization;
            if (hdr) {
              clearInterval(t);
              resolve(true);
            }
            waited += interval;
            if (waited >= timeout) {
              clearInterval(t);
              resolve(false);
            }
          }, interval);
        });
      };

      const headerReady = await waitForAuthHeader(2000);
      console.log('Authorization header ready after login:', headerReady, (api.defaults.headers as any).common?.Authorization || (api.defaults.headers as any).Authorization);

      // Load reports immediately after successful login
      try {
        await loadReports();
        setActiveTab('reports');
      } catch (loadErr) {
        console.error('Error loading reports after login:', loadErr);
      }
      
    } catch (error: any) {
      setLoginError(error.message || 'Giriş başarısız');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    clearAuthCredentials();
    setAuthenticated(false);
    // Clear all data
    setWeeklyReports([]);
    setMonthlyReports([]);
    setAllPayments([]);
    setYearlyReport(null);
  };

  // Note: Removed localStorage.clear() to preserve authentication across refreshes

  // Get available months from reports
  const getAvailableMonths = () => {
    const months = new Set<string>();
    
    // Add months from weekly reports
    weeklyReports.forEach(report => {
      const startDate = new Date(report.start_date);
      const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    
    // Add months from monthly reports
    monthlyReports.forEach(report => {
      const date = new Date(report.month);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    
    return Array.from(months).sort();
  };

  // Filter reports based on selected month
  const getFilteredWeeklyReports = () => {
    if (selectedMonth === 'all') return weeklyReports;
    
    return weeklyReports.filter(report => {
      const startDate = new Date(report.start_date);
      const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === selectedMonth;
    });
  };

  const getFilteredMonthlyReports = () => {
    if (selectedMonth === 'all') return monthlyReports;
    
    return monthlyReports.filter(report => {
      const date = new Date(report.month);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === selectedMonth;
    });
  };

  // Format month for display
  const formatMonthDisplay = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
  };

  // Load existing reports on component mount
  useEffect(() => {
    if (authenticated) {
      loadReports();
    }
  }, [authenticated]);

  useEffect(() => {
    if (activeTab === 'yearly') {
      // Fetch yearly report from backend API
      const fetchYearlyReport = async () => {
        try {
          setIsLoading(true);
          const response = await paymentAPI.getYearlyReport(currentYear);
          setYearlyReport(response);
        } catch (error) {
          console.error('Failed to load yearly report:', error);
          setError('Yıllık rapor yüklenemedi');
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchYearlyReport();
    }
  }, [activeTab, currentYear]);

  const loadReports = async () => {
    if (!authenticated) {
      console.log('Not authenticated, skipping reports load');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading reports...');
      // Debug: log current Authorization header
      try {
        console.log('Current Authorization header before getReports:', (api.defaults.headers as any).common?.Authorization || (api.defaults.headers as any).Authorization);
      } catch (err) {
        console.log('Could not read Authorization header', err);
      }

      const response = await paymentAPI.getReports();
      console.log('Reports response:', response);
      setWeeklyReports(response.weekly_reports || []);
      setMonthlyReports(response.monthly_reports || []);
      
      // Also load all payments for check payment details
      const paymentsResponse = await paymentAPI.getPayments();
      console.log('Payments response:', paymentsResponse?.length || 0);
      setAllPayments(paymentsResponse || []);
      
      console.log('Reports loaded successfully:', {
        weekly: response.weekly_reports?.length || 0,
        monthly: response.monthly_reports?.length || 0,
        payments: paymentsResponse?.length || 0
      });
    } catch (error) {
      console.error('Failed to load reports:', error);
      setWeeklyReports([]);
      setMonthlyReports([]);
      setAllPayments([]);
      setError('Raporlar yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm('Bu işlem tüm verileri silecektir. Emin misiniz?')) {
      try {
        setIsLoading(true);
        await paymentAPI.clearAllPayments();
        setWeeklyReports([]);
        setMonthlyReports([]);
        setAllPayments([]);
        setYearlyReport(null);
        setYearlyReport(null);
        setSuccess('Tüm veriler başarıyla silindi');
        setError(null);
      } catch (err) {
        setError('Veriler silinirken hata oluştu');
        console.error('Clear data error:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteByDateRange = async () => {
    if (!deleteStartDate || !deleteEndDate) {
      setError('Başlangıç ve bitiş tarihleri gereklidir');
      return;
    }

    if (deleteStartDate > deleteEndDate) {
      setError('Başlangıç tarihi bitiş tarihinden sonra olamaz');
      return;
    }

    // Calculate the difference in days
    const start = new Date(deleteStartDate);
    const end = new Date(deleteEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const confirmMessage = deleteStartDate === deleteEndDate 
      ? `${deleteStartDate} tarihindeki tüm ödeme verilerini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`
      : `${deleteStartDate} ile ${deleteEndDate} arasındaki ${diffDays} günlük tüm ödeme verilerini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`;
    
    if (window.confirm(confirmMessage)) {
      try {
        setIsDeleting(true);
        setError(null);
        
        const response = await fetch(`http://localhost:8080/api/payments/date-range?start_date=${deleteStartDate}&end_date=${deleteEndDate}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Tarih aralığı silme işlemi başarısız');
        }
        
        const result = await response.json();
        const deletedCount = result.deleted || 0;
        
        if (deletedCount === 0) {
          setSuccess(`Belirtilen tarih aralığında silinecek veri bulunamadı (${deleteStartDate} - ${deleteEndDate})`);
        } else {
          setSuccess(`${deletedCount} adet ödeme kaydı başarıyla silindi (${deleteStartDate} - ${deleteEndDate})`);
        }
        
        // Reload reports after deletion
        loadReports();
        
        // Reset form
        setDeleteStartDate('');
        setDeleteEndDate('');
        setShowDateRangeDelete(false);
        
      } catch (err) {
        setError('Tarih aralığı silinirken hata oluştu: ' + (err as Error).message);
        console.error('Delete by date range error:', err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleUploadSuccess = (response: UploadResponse) => {
    setSuccess(response.message);
    setError(null);
    
    if (response.weekly_reports && response.weekly_reports.length > 0) {
      setWeeklyReports(response.weekly_reports);
    }
    
    // Reload all reports to get updated monthly data
    loadReports();
    
    // Switch to reports tab
    setActiveTab('reports');
    
    // Clear success message after 5 seconds
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess(null);
    
    // Clear error message after 10 seconds
    setTimeout(() => setError(null), 10000);
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Sistem kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!authenticated) {
    return (
      <Login 
        onLogin={handleLogin}
        isLoading={loginLoading}
        error={loginError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="w-full py-6 px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Tahsilat Raporu</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Çıkış Yap
          </button>
        </div>
      </header>

      <main className="w-full py-8 px-4">
        {/* Tab Navigation */}
        <div className="mb-8 flex space-x-4 justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'upload' ? 'bg-blue-600 text-white' : 'bg-white text-black border border-gray-300 hover:bg-gray-50'}`}
            >
              Dosya Yükle
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'bg-white text-black border border-gray-300 hover:bg-gray-50'}`}
            >
              Raporlar
            </button>
            <button
              onClick={() => setActiveTab('yearly')}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'yearly' ? 'bg-blue-600 text-white' : 'bg-white text-black border border-gray-300 hover:bg-gray-50'}`}
            >
              Yıllık Raporlar
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'payments' ? 'bg-blue-600 text-white' : 'bg-white text-black border border-gray-300 hover:bg-gray-50'}`}
            >
              Tüm Ödemeler
            </button>
            <button
              onClick={() => setActiveTab('debug')}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'debug' ? 'bg-blue-600 text-white' : 'bg-white text-black border border-gray-300 hover:bg-gray-50'}`}
            >
              Debug
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowDateRangeDelete(!showDateRangeDelete)}
              className="px-4 py-2 rounded-lg font-medium bg-orange-600 text-black hover:bg-orange-700"
            >
              Tarih Aralığı Sil
            </button>
            <button
              onClick={handleClearAllData}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-medium bg-red-600 text-black hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Siliniyor...' : 'Tüm Verileri Sil'}
            </button>
          </div>
        </div>

        {/* Date Range Delete Panel */}
        {showDateRangeDelete && (
          <div className="mb-6 bg-white rounded-lg shadow-md p-6 border border-orange-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tarih Aralığına Göre Veri Silme</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-black mb-2">
                  Başlangıç Tarihi
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={deleteStartDate}
                  onChange={(e) => setDeleteStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-black mb-2">
                  Bitiş Tarihi
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={deleteEndDate}
                  onChange={(e) => setDeleteEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="flex flex-col space-y-2">
                {/* Debug Info */}
                <div className="text-xs text-black">
                  <div>Başlangıç: {deleteStartDate || '(boş)'}</div>
                  <div>Bitiş: {deleteEndDate || '(boş)'}</div>
                  <div>Durum: {isDeleting ? 'Siliniyor' : 'Hazır'}</div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleDeleteByDateRange}
                    disabled={isDeleting || !deleteStartDate || !deleteEndDate}
                    className="px-4 py-2 rounded-lg font-medium bg-orange-600 text-black hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? 'Siliniyor...' : 'Sil'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDateRangeDelete(false);
                      setDeleteStartDate('');
                      setDeleteEndDate('');
                    }}
                    className="px-4 py-2 rounded-lg font-medium bg-gray-300 text-black hover:bg-gray-400"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800">
                <strong>Uyarı:</strong> Bu işlem seçilen tarih aralığındaki tüm ödeme kayıtlarını kalıcı olarak silecektir. Bu işlem geri alınamaz.
              </p>
              {deleteStartDate && deleteEndDate && (
                <p className="text-sm text-orange-900 font-medium mt-2">
                  Silinecek tarih aralığı: {deleteStartDate} - {deleteEndDate}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mb-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'upload' && (
          <FileUpload
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        )}

        {activeTab === 'debug' && (
          <DebugPanel />
        )}

        {activeTab === 'reports' && (
          <div>
            {!weeklyReports || weeklyReports.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz rapor yok</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Raporları görmek için önce bir dosya yükleyin.
                </p>
              </div>
            ) : (
              <div>
                {/* Report Controls */}
                <div className="mb-6 bg-white rounded-lg shadow p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Report Type Toggle */}
                    <div className="flex rounded-lg border border-gray-200">
                      <button
                        onClick={() => setReportType('weekly')}
                        className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                          reportType === 'weekly'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-black hover:bg-gray-300'
                        }`}
                      >
                        Haftalık Raporlar
                      </button>
                      <button
                        onClick={() => setReportType('monthly')}
                        className={`px-4 py-2 text-sm font-medium rounded-r-lg border-l ${
                          reportType === 'monthly'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-black hover:bg-gray-300'
                        }`}
                      >
                        Aylık Raporlar
                      </button>
                    </div>

                    {/* Month Filter */}
                    <div className="flex items-center space-x-3">
                      <label className="text-sm font-medium text-black">
                        Ay Filtresi:
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">Tüm Aylar</option>
                        {getAvailableMonths().map(month => (
                          <option key={month} value={month}>
                            {formatMonthDisplay(month)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Report Summary */}
                    <div className="text-sm text-gray-800">
                      {reportType === 'weekly' ? (
                        <span>
                          {getFilteredWeeklyReports().length} haftalık rapor
                          {selectedMonth !== 'all' && ` - ${formatMonthDisplay(selectedMonth)}`}
                        </span>
                      ) : (
                        <span>
                          {getFilteredMonthlyReports().length} aylık rapor
                          {selectedMonth !== 'all' && ` - ${formatMonthDisplay(selectedMonth)}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Weekly Reports */}
                {reportType === 'weekly' && (
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-black mb-6">
                      Haftalık Raporlar
                      {selectedMonth !== 'all' && ` - ${formatMonthDisplay(selectedMonth)}`}
                    </h2>
                    {getFilteredWeeklyReports().length === 0 ? (
                      <div className="text-center py-8 bg-white rounded-lg shadow">
                        <p className="text-gray-500">Seçilen ay için haftalık rapor bulunamadı.</p>
                      </div>
                    ) : (
                      getFilteredWeeklyReports().map((report, index) => (
                        <WeeklyReport
                          key={`${report.start_date}-${report.end_date}`}
                          report={report}
                          weekNumber={index + 1}
                          allPayments={allPayments}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* Monthly Reports */}
                {reportType === 'monthly' && monthlyReports && monthlyReports.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-6">
                      Aylık Raporlar
                      {selectedMonth !== 'all' && ` - ${formatMonthDisplay(selectedMonth)}`}
                    </h2>
                    {getFilteredMonthlyReports().length === 0 ? (
                      <div className="text-center py-8 bg-white rounded-lg shadow">
                        <p className="text-gray-500">Seçilen ay için aylık rapor bulunamadı.</p>
                      </div>
                    ) : (
                      getFilteredMonthlyReports().map((report, index) => (
                        <MonthlyReport
                          key={report.month}
                          report={report}
                          allPayments={allPayments}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <AllPayments />
        )}

        {activeTab === 'yearly' && yearlyReport && (
          <YearlyReportComponent report={yearlyReport} />
        )}
      </main>
    </div>
  );
}

export default App;