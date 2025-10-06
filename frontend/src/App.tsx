import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { WeeklyReport } from './components/WeeklyReport';
import { MonthlyReport } from './components/MonthlyReport';
import { DebugPanel } from './components/DebugPanel';
import { paymentAPI } from './services/api';
import { WeeklyReport as WeeklyReportType, MonthlyReport as MonthlyReportType, UploadResponse } from './types/payment.types';

function App() {
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReportType[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReportType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'reports' | 'debug'>('upload');
  const [selectedMonth, setSelectedMonth] = useState<string | 'all'>('all');
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');

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
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const response = await paymentAPI.getReports();
      setWeeklyReports(response.weekly_reports || []);
      setMonthlyReports(response.monthly_reports || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
      // Don't show error for initial load, just log it
      setWeeklyReports([]);
      setMonthlyReports([]);
    } finally {
      setIsLoading(false);
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

  const handleExportExcel = async () => {
    try {
      setIsLoading(true);
      const blob = await paymentAPI.exportExcel();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tahsilat-raporu.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Excel dosyası başarıyla indirildi');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Excel dosyası indirilemedi');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsLoading(true);
      const blob = await paymentAPI.exportPDF();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tahsilat-raporu.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('PDF dosyası başarıyla indirildi');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('PDF dosyası indirilemedi');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Tahsilat Raporu
              </h1>
              <p className="text-gray-600 mt-1">
                Model Kuyum Merkezi - Model Sanayi Merkezi Ödeme Takip Sistemi
              </p>
            </div>
            
            {/* Export Buttons */}
            {weeklyReports && weeklyReports.length > 0 && (
              <div className="flex space-x-3">
                <button
                  onClick={handleExportExcel}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel İndir
                </button>
                
                <button
                  onClick={handleExportPDF}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF İndir
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dosya Yükleme
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Raporlar
            </button>
            <button
              onClick={() => setActiveTab('debug')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'debug'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔧 Debug
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Haftalık Raporlar
                      </button>
                      <button
                        onClick={() => setReportType('monthly')}
                        className={`px-4 py-2 text-sm font-medium rounded-r-lg border-l ${
                          reportType === 'monthly'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Aylık Raporlar
                      </button>
                    </div>

                    {/* Month Filter */}
                    <div className="flex items-center space-x-3">
                      <label className="text-sm font-medium text-gray-700">
                        Ay Filtresi:
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <div className="text-sm text-gray-500">
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
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
                        />
                      ))
                    )}
                  </div>
                )}

                {/* Monthly Reports */}
                {reportType === 'monthly' && monthlyReports && monthlyReports.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
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
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;