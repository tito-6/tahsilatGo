import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { WeeklyReport } from './components/WeeklyReport';
import { MonthlyReport } from './components/MonthlyReport';
import { DebugPanel } from './components/DebugPanel';
import YearlyReportComponent from './components/YearlyReport';
import { paymentAPI } from './services/api';
import { WeeklyReport as WeeklyReportType, MonthlyReport as MonthlyReportType, UploadResponse, YearlyReport } from './types/payment.types';

function App() {
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReportType[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReportType[]>([]);
  const [yearlyReport, setYearlyReport] = useState<YearlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'reports' | 'yearly' | 'debug'>('upload');
  const [selectedMonth, setSelectedMonth] = useState<string | 'all'>('all');
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const currentYear = new Date().getFullYear();

  // Clear localStorage and sessionStorage on app load
  useEffect(() => {
    localStorage.clear();
    sessionStorage.clear();
  }, []);

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

  useEffect(() => {
    if (activeTab === 'yearly') {
      // Aggregate yearly report from loaded monthly reports
      const year = currentYear;
      const mkmTotals = { tl: 0, usd: 0, total_usd: 0 };
      const msmTotals = { tl: 0, usd: 0, total_usd: 0 };
      const paymentMethods = { 'Banka Havalesi': { tl: 0, usd: 0, total_usd: 0 }, 'Nakit': { tl: 0, usd: 0, total_usd: 0 }, 'Çek': { tl: 0, usd: 0, total_usd: 0 } };
      const mkmPaymentMethods = { 'Banka Havalesi': { tl: 0, usd: 0, total_usd: 0 }, 'Nakit': { tl: 0, usd: 0, total_usd: 0 }, 'Çek': { tl: 0, usd: 0, total_usd: 0 } };
      const msmPaymentMethods = { 'Banka Havalesi': { tl: 0, usd: 0, total_usd: 0 }, 'Nakit': { tl: 0, usd: 0, total_usd: 0 }, 'Çek': { tl: 0, usd: 0, total_usd: 0 } };
      const locationSummary: Record<string, { mkm: number; msm: number; total: number }> = {
        'BANKA HAVALESİ': { mkm: 0, msm: 0, total: 0 },
        'CARŞI': { mkm: 0, msm: 0, total: 0 },
        'KUYUMCUKENT': { mkm: 0, msm: 0, total: 0 },
        'OFİS': { mkm: 0, msm: 0, total: 0 },
        'ÇEK': { mkm: 0, msm: 0, total: 0 },
      };
      let mkmUSD = 0, msmUSD = 0;
      monthlyReports.forEach(report => {
        const reportYear = new Date(report.month).getFullYear();
        if (reportYear === year) {
          mkmUSD += report.project_summary.mkm;
          msmUSD += report.project_summary.msm;
          // Aggregate payment methods
          ['Banka Havalesi', 'Nakit', 'Çek'].forEach(method => {
            const mkm = report.mkm_payment_methods?.[method] || { tl: 0, usd: 0, total_usd: 0 };
            const msm = report.msm_payment_methods?.[method] || { tl: 0, usd: 0, total_usd: 0 };
            (mkmPaymentMethods[method as keyof typeof mkmPaymentMethods].tl += mkm.tl);
            (mkmPaymentMethods[method as keyof typeof mkmPaymentMethods].usd += mkm.usd);
            (mkmPaymentMethods[method as keyof typeof mkmPaymentMethods].total_usd += mkm.total_usd);
            (msmPaymentMethods[method as keyof typeof msmPaymentMethods].tl += msm.tl);
            (msmPaymentMethods[method as keyof typeof msmPaymentMethods].usd += msm.usd);
            (msmPaymentMethods[method as keyof typeof msmPaymentMethods].total_usd += msm.total_usd);
            (paymentMethods[method as keyof typeof paymentMethods].tl += mkm.tl + msm.tl);
            (paymentMethods[method as keyof typeof paymentMethods].usd += mkm.usd + msm.usd);
            (paymentMethods[method as keyof typeof paymentMethods].total_usd += mkm.total_usd + msm.total_usd);
          });
          // Aggregate location summary
          Object.entries(report.location_summary).forEach(([loc, summary]) => {
            if (locationSummary[loc]) {
              locationSummary[loc].mkm += summary.mkm;
              locationSummary[loc].msm += summary.msm;
              locationSummary[loc].total += summary.total;
            }
          });
        }
      });
      setYearlyReport({
        year,
        project_summary: { mkm: mkmUSD, msm: msmUSD },
        location_summary: locationSummary,
        payment_methods: paymentMethods,
        mkm_payment_methods: mkmPaymentMethods,
        msm_payment_methods: msmPaymentMethods,
      });
    }
  }, [activeTab, currentYear, monthlyReports]);

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

  const handleClearAllData = async () => {
    if (window.confirm('Bu işlem tüm verileri silecektir. Emin misiniz?')) {
      try {
        setIsLoading(true);
        await paymentAPI.clearAllPayments();
        setWeeklyReports([]);
        setMonthlyReports([]);
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

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="w-full py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">Tahsilat Raporu</h1>
        </div>
      </header>

      <main className="w-full py-8 px-4">
        {/* Tab Navigation */}
        <div className="mb-8 flex space-x-4 justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'upload' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
            >
              Dosya Yükle
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
            >
              Raporlar
            </button>
            <button
              onClick={() => setActiveTab('yearly')}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'yearly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
            >
              Yıllık Raporlar
            </button>
            <button
              onClick={() => setActiveTab('debug')}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'debug' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
            >
              Debug
            </button>
          </div>
          <button
            onClick={handleClearAllData}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Siliniyor...' : 'Tüm Verileri Sil'}
          </button>
        </div>

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

        {activeTab === 'yearly' && yearlyReport && (
          <YearlyReportComponent report={yearlyReport} />
        )}
      </main>
    </div>
  );
}

export default App;