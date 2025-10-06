import React from 'react';
import { MonthlyReport as MonthlyReportType } from '../types/payment.types';
import { formatAmountUSD } from '../utils/formatters';
import { formatMonth } from '../utils/dateHelpers';

interface MonthlyReportProps {
  report: MonthlyReportType;
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ report }) => {
  const totalProjectUSD = report.project_summary.mkm + report.project_summary.msm;
  const totalLocationUSD = Object.values(report.location_summary).reduce((sum, location) => sum + location.total, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Aylık Rapor
        </h2>
        <p className="text-gray-600">
          {formatMonth(report.month)}
        </p>
      </div>

      {/* Project Monthly Summary */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Proje Aylık Özeti
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                  Proje
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                  Tutar (USD)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                  AYLIK MKM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSD(report.project_summary.mkm)}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                  AYLIK MSM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSD(report.project_summary.msm)}
                </td>
              </tr>
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                  TOPLAM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSD(totalProjectUSD)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Location-Based Collection Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Lokasyon Bazlı Tahsilat Detayları
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                  Lokasyon/Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                  MKM AYLIK (USD)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                  MSM AYLIK (USD)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                  TOPLAM (USD)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(report.location_summary).map(([location, totals]) => (
                <tr key={location} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                    {location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                    {formatAmountUSD(totals.mkm)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                    {formatAmountUSD(totals.msm)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                    {formatAmountUSD(totals.total)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                  TOPLAM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSD(
                    Object.values(report.location_summary).reduce((sum, location) => sum + location.mkm, 0)
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSD(
                    Object.values(report.location_summary).reduce((sum, location) => sum + location.msm, 0)
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSD(totalLocationUSD)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
