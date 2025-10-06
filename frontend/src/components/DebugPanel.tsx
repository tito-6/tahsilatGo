import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface DatabaseStats {
  total_records: number;
  by_currency: Record<string, { count: number; total_amount: number }>;
  by_project: Record<string, number>;
  date_range: { earliest: string; latest: string };
}

export const DebugPanel: React.FC = () => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/stats');
      setStats(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm('Are you sure you want to clear ALL payment data? This cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete('/payments');
      alert('All payment data has been cleared successfully');
      fetchStats(); // Refresh stats
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-yellow-800">🔧 Debug Panel</h3>
        <div className="space-x-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={clearAllData}
            disabled={loading}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
          >
            Clear All Data
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {stats && (
        <div className="space-y-4">
          {/* Total Records */}
          <div className="bg-white p-4 rounded border">
            <h4 className="font-semibold text-gray-700 mb-2">Database Summary</h4>
            <p><strong>Total Records:</strong> {stats.total_records}</p>
            <p><strong>Date Range:</strong> {stats.date_range.earliest} to {stats.date_range.latest}</p>
          </div>

          {/* Currency Breakdown */}
          <div className="bg-white p-4 rounded border">
            <h4 className="font-semibold text-gray-700 mb-2">By Currency</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.by_currency).map(([currency, data]) => (
                    <tr key={currency}>
                      <td className="text-sm font-medium text-gray-900">{currency}</td>
                      <td className="text-sm text-gray-900">{data.count}</td>
                      <td className="text-sm text-gray-900">{data.total_amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Project Breakdown */}
          <div className="bg-white p-4 rounded border">
            <h4 className="font-semibold text-gray-700 mb-2">By Project</h4>
            <div className="space-y-1">
              {Object.entries(stats.by_project).map(([project, count]) => (
                <p key={project}>
                  <strong>{project}:</strong> {count} records
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};