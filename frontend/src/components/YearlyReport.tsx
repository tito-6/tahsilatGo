import React from 'react';
import { YearlyReport } from '../types/payment.types';
import { formatAmountUSDPlain } from '../utils/formatters';

interface YearlyReportProps {
  report: YearlyReport;
}

const YearlyReportComponent: React.FC<YearlyReportProps> = ({ report }) => {
  const totalProjectUSD = report.project_summary.mkm + report.project_summary.msm;

  return (
    <div className="p-6 bg-white">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        {report.year} Yılı Tahsilat Raporu
      </h2>

      {/* Yearly Project Summary */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Yıllık Proje Özeti
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
                  YILLIK MKM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSDPlain(report.project_summary.mkm)}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                  YILLIK MSM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSDPlain(report.project_summary.msm)}
                </td>
              </tr>
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                  TOPLAM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSDPlain(totalProjectUSD)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Yearly Payment Method Distribution */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Yıllık Proje Bazında Ödeme Şekli Dağılımı
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MKM Payment Methods */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">
              {report.year} YILI MKM TAHSİLATLAR
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Ödeme Nedeni
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Toplam TL
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Toplam USD
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {['Banka Havalesi', 'Nakit', 'Çek'].map((method) => {
                    const methodData = report.mkm_payment_methods?.[method] || { tl: 0, usd: 0, total_usd: 0 };
                    return (
                      <tr key={method} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                          {method}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                          {methodData.tl > 0 ? formatAmountUSDPlain(methodData.tl) : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                          {methodData.total_usd > 0 ? formatAmountUSDPlain(methodData.total_usd) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 font-semibold">
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                      Genel Toplam
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                      {formatAmountUSDPlain(Object.values(report.mkm_payment_methods || {}).reduce((sum, method) => sum + method.tl, 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                      {formatAmountUSDPlain(Object.values(report.mkm_payment_methods || {}).reduce((sum, method) => sum + method.total_usd, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* MSM Payment Methods */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">
              {report.year} YILI MSM TAHSİLATLAR
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Ödeme Nedeni
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Toplam TL
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Toplam USD
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {['Banka Havalesi', 'Nakit', 'Çek'].map((method) => {
                    const methodData = report.msm_payment_methods?.[method] || { tl: 0, usd: 0, total_usd: 0 };
                    return (
                      <tr key={method} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                          {method}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                          {methodData.tl > 0 ? formatAmountUSDPlain(methodData.tl) : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                          {methodData.total_usd > 0 ? formatAmountUSDPlain(methodData.total_usd) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-yellow-200 font-semibold">
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                      Toplam
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                      {formatAmountUSDPlain(Object.values(report.msm_payment_methods || {}).reduce((sum, method) => sum + method.tl, 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                      {formatAmountUSDPlain(Object.values(report.msm_payment_methods || {}).reduce((sum, method) => sum + method.total_usd, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Combined Total */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">
              {report.year} YILI GENEL
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Ödeme Nedeni
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Toplam TL
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Toplam USD
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {['Banka Havalesi', 'Nakit', 'Çek'].map((method) => {
                    const mkmData = report.mkm_payment_methods?.[method] || { tl: 0, usd: 0, total_usd: 0 };
                    const msmData = report.msm_payment_methods?.[method] || { tl: 0, usd: 0, total_usd: 0 };
                    const combinedTL = mkmData.tl + msmData.tl;
                    const combinedUSD = mkmData.total_usd + msmData.total_usd;
                    return (
                      <tr key={method} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                          {method}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                          {combinedTL > 0 ? formatAmountUSDPlain(combinedTL) : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                          {combinedUSD > 0 ? formatAmountUSDPlain(combinedUSD) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-yellow-200 font-semibold">
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                      Toplam
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                      {formatAmountUSDPlain(
                        Object.values(report.mkm_payment_methods || {}).reduce((sum, method) => sum + method.tl, 0) +
                        Object.values(report.msm_payment_methods || {}).reduce((sum, method) => sum + method.tl, 0)
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                      {formatAmountUSDPlain(
                        Object.values(report.mkm_payment_methods || {}).reduce((sum, method) => sum + method.total_usd, 0) +
                        Object.values(report.msm_payment_methods || {}).reduce((sum, method) => sum + method.total_usd, 0)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Yearly Location Summary */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Yıllık Lokasyon Bazlı Tahsilat Detayları
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                  Lokasyon/Method
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                  MKM YILLIK (USD)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                  MSM YILLIK (USD)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                  TOPLAM (USD)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(report.location_summary).map(([location, summary]) => (
                <tr key={location} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                    {location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                    {formatAmountUSDPlain(summary.mkm)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                    {formatAmountUSDPlain(summary.msm)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                    {formatAmountUSDPlain(summary.total)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                  TOPLAM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                  {formatAmountUSDPlain(report.project_summary.mkm)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                  {formatAmountUSDPlain(report.project_summary.msm)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                  {formatAmountUSDPlain(totalProjectUSD)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default YearlyReportComponent;