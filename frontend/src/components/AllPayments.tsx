import React, { useState, useEffect } from 'react';
import { PaymentRecord } from '../types/payment.types';
import { paymentAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

interface AllPaymentsProps {}

export const AllPayments: React.FC<AllPaymentsProps> = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedPayments, setSelectedPayments] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<keyof PaymentRecord>('payment_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<{
    currency: string;
    paymentMethod: string;
    project: string;
    dateFrom: string;
    dateTo: string;
  }>({
    currency: 'all',
    paymentMethod: 'all',
    project: 'all',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await paymentAPI.getPayments();
      setPayments(data || []);
    } catch (error) {
      console.error('Failed to load payments:', error);
      setError('Ödeme verileri yüklenemedi');
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!window.confirm('Bu ödeme kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve raporlar güncellenir.')) {
      return;
    }

    try {
      setDeletingId(paymentId);
      await paymentAPI.deletePayment(paymentId);
      
      // Remove the payment from the local state
      setPayments(payments.filter(payment => payment.id !== paymentId));
      
      // Show success message
      alert('Ödeme kaydı başarıyla silindi. Raporlar güncellendi.');
    } catch (error) {
      console.error('Error deleting payment:', error);
      setError('Ödeme silinirken hata oluştu');
      alert('Ödeme silinirken hata oluştu');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPayments.size === 0) {
      alert('Lütfen silinecek ödemeleri seçin.');
      return;
    }

    if (!window.confirm(`Seçilen ${selectedPayments.size} ödeme kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve raporlar güncellenir.`)) {
      return;
    }

    try {
      setBulkDeleting(true);
      const promises = Array.from(selectedPayments).map(id => paymentAPI.deletePayment(id));
      await Promise.all(promises);
      
      // Remove the payments from the local state
      setPayments(payments.filter(payment => !selectedPayments.has(payment.id!)));
      setSelectedPayments(new Set());
      
      alert(`${selectedPayments.size} ödeme kaydı başarıyla silindi. Raporlar güncellendi.`);
    } catch (error) {
      console.error('Error bulk deleting payments:', error);
      setError('Toplu silme işlemi sırasında hata oluştu');
      alert('Toplu silme işlemi sırasında hata oluştu');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSelectPayment = (paymentId: number) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedPayments(newSelected);
  };

  const handleSelectAll = () => {
    const filteredPayments = getFilteredAndSortedPayments();
    if (selectedPayments.size === filteredPayments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(filteredPayments.map(p => p.id!)));
    }
  };

  // Get unique values for filters
  const getUniqueValues = (field: keyof PaymentRecord): string[] => {
    const values = payments.map(payment => payment[field] as string).filter(Boolean);
    return Array.from(new Set(values)).sort();
  };

  // Filter and sort payments
  const getFilteredAndSortedPayments = () => {
    let filtered = payments.filter(payment => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          payment.customer_name.toLowerCase().includes(searchLower) ||
          payment.account_name.toLowerCase().includes(searchLower) ||
          payment.project.toLowerCase().includes(searchLower) ||
          payment.payment_method.toLowerCase().includes(searchLower) ||
          payment.location.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Currency filter
      if (filterBy.currency !== 'all' && payment.currency !== filterBy.currency) {
        return false;
      }

      // Payment method filter
      if (filterBy.paymentMethod !== 'all' && payment.payment_method !== filterBy.paymentMethod) {
        return false;
      }

      // Project filter
      if (filterBy.project !== 'all' && payment.project !== filterBy.project) {
        return false;
      }

      // Date range filter
      if (filterBy.dateFrom) {
        const paymentDate = new Date(payment.payment_date);
        const fromDate = new Date(filterBy.dateFrom);
        if (paymentDate < fromDate) return false;
      }

      if (filterBy.dateTo) {
        const paymentDate = new Date(payment.payment_date);
        const toDate = new Date(filterBy.dateTo);
        if (paymentDate > toDate) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle undefined values
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      // Handle different data types
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  };

  const handleSort = (field: keyof PaymentRecord) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: keyof PaymentRecord) => {
    if (sortBy !== field) {
      return '↕️';
    }
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterBy({
      currency: 'all',
      paymentMethod: 'all',
      project: 'all',
      dateFrom: '',
      dateTo: ''
    });
  };

  const filteredPayments = getFilteredAndSortedPayments();
  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount_usd, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Ödeme verileri yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tüm Ödemeler</h2>
          <p className="text-sm text-gray-600">
            Toplam {payments.length} ödeme • Filtrelenen {filteredPayments.length} ödeme
            {filteredPayments.length > 0 && (
              <span> • Toplam Tutar: {formatCurrency(totalAmount, 'USD')}</span>
            )}
          </p>
        </div>
        <div className="flex space-x-2">
          {selectedPayments.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
            >
              {bulkDeleting ? `Siliniyor... (${selectedPayments.size})` : `Seçilenleri Sil (${selectedPayments.size})`}
            </button>
          )}
          <button
            onClick={loadPayments}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Yenileniyor...' : 'Yenile'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtreler</h3>
        
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Müşteri adı, hesap adı, proje vb. ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
          {/* Currency Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Para Birimi</label>
            <select
              value={filterBy.currency}
              onChange={(e) => setFilterBy(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              {getUniqueValues('currency').map(currency => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi</label>
            <select
              value={filterBy.paymentMethod}
              onChange={(e) => setFilterBy(prev => ({ ...prev, paymentMethod: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              {getUniqueValues('payment_method').map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proje</label>
            <select
              value={filterBy.project}
              onChange={(e) => setFilterBy(prev => ({ ...prev, project: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              {getUniqueValues('project').map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              value={filterBy.dateFrom}
              onChange={(e) => setFilterBy(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
            <input
              type="date"
              value={filterBy.dateTo}
              onChange={(e) => setFilterBy(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Clear Filters */}
        <button
          onClick={clearFilters}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
        >
          Filtreleri Temizle
        </button>
      </div>

      {/* Payments Table */}
      {payments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz ödeme yok</h3>
          <p className="mt-1 text-sm text-gray-500">
            Ödemeleri görmek için önce bir dosya yükleyin.
          </p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">Filtrelere uygun ödeme bulunamadı.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedPayments.size === filteredPayments.length && filteredPayments.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('payment_date')}
                  >
                    Tarih {getSortIcon('payment_date')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('customer_name')}
                  >
                    Müşteri {getSortIcon('customer_name')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('amount')}
                  >
                    Tutar {getSortIcon('amount')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('currency')}
                  >
                    Para Birimi {getSortIcon('currency')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('amount_usd')}
                  >
                    USD Tutar {getSortIcon('amount_usd')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('payment_method')}
                  >
                    Ödeme Yöntemi {getSortIcon('payment_method')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('project')}
                  >
                    Proje {getSortIcon('project')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('location')}
                  >
                    Lokasyon {getSortIcon('location')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('account_name')}
                  >
                    Hesap Adı {getSortIcon('account_name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span title="Kayıtları seçerek silme seçeneklerini görün">
                      İşlemler
                      {selectedPayments.size === 0 && (
                        <span className="ml-1 text-xs text-gray-400 lowercase">
                          (seç)
                        </span>
                      )}
                    </span>
                  </th>
                </tr>
              </thead>
              {selectedPayments.size === 0 && filteredPayments.length > 0 && (
                <tbody>
                  
                </tbody>
              )}
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment, index) => (
                  <tr key={payment.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedPayments.has(payment.id!)}
                        onChange={() => handleSelectPayment(payment.id!)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.currency === 'USD' ? 'bg-green-100 text-green-800' :
                        payment.currency === 'TL' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {payment.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatCurrency(payment.amount_usd, 'USD')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.payment_method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.project === 'MKM' ? 'bg-orange-100 text-orange-800' :
                        'bg-indigo-100 text-indigo-800'
                      }`}>
                        {payment.project}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.location}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {payment.account_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {selectedPayments.has(payment.id!) && (
                        <button
                          onClick={() => handleDeletePayment(payment.id!)}
                          disabled={deletingId === payment.id}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          title="Bu ödeme kaydını sil"
                        >
                          {deletingId === payment.id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Siliniyor...
                            </>
                          ) : (
                            <>
                              🗑️ Sil
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllPayments;