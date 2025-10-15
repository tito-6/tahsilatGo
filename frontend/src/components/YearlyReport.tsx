import React from 'react';
import { YearlyReport } from '../types/payment.types';
import { formatAmountUSDPlain } from '../utils/formatters';
import { paymentAPI } from '../services/api';

interface YearlyReportProps {
  report: YearlyReport;
}

const YearlyReportComponent: React.FC<YearlyReportProps> = ({ report }) => {
  const totalProjectUSD = report.project_summary.mkm + report.project_summary.msm;

  const handleExportExcel = async () => {
    try {
      const blob = await paymentAPI.exportYearlyExcel(report.year);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.year}-yili-tahsilat-raporu.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Excel dışa aktarımı başarısız oldu');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{report.year} Yılı Tahsilat Raporu</h2>
        <button
          onClick={handleExportExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel İndir
        </button>
      </div>

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
        <div className="flex w-full gap-6" style={{width: '100%'}}>
          {/* MKM Payment Methods */}
          <div className="flex-1 flex flex-col min-h-[400px]">
            <h4 className="text-md font-medium text-gray-900 mb-3">
              {report.year} YILI MKM TAHSİLATLAR
            </h4>
            <div className="overflow-y-auto" style={{maxHeight: '340px'}}>
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
                          {formatAmountUSDPlain(methodData.tl)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                          {formatAmountUSDPlain(methodData.usd)}
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
                      {formatAmountUSDPlain(Object.values(report.mkm_payment_methods || {}).reduce((sum, method) => sum + method.usd, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* MSM Payment Methods */}
          <div className="flex-1 flex flex-col min-h-[400px]">
            <h4 className="text-md font-medium text-gray-900 mb-3">
              {report.year} YILI MSM TAHSİLATLAR
            </h4>
            <div className="overflow-y-auto" style={{maxHeight: '340px'}}>
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
                          {formatAmountUSDPlain(methodData.tl)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                          {formatAmountUSDPlain(methodData.usd)}
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
                      {formatAmountUSDPlain(Object.values(report.msm_payment_methods || {}).reduce((sum, method) => sum + method.usd, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Combined Total */}
          <div className="flex-1 flex flex-col min-h-[400px]">
            <h4 className="text-md font-medium text-gray-900 mb-3">
              {report.year} YILI GENEL
            </h4>
            <div className="overflow-y-auto" style={{maxHeight: '340px'}}>
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
                    const combinedUSD = mkmData.usd + msmData.usd;
                    return (
                      <tr key={method} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                          {method}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                          {formatAmountUSDPlain(combinedTL)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                          {formatAmountUSDPlain(combinedUSD)}
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
                        Object.values(report.mkm_payment_methods || {}).reduce((sum, method) => sum + method.usd, 0) +
                        Object.values(report.msm_payment_methods || {}).reduce((sum, method) => sum + method.usd, 0)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Payment Method Distribution for Each Month */}
  {report.monthly_reports && report.monthly_reports.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Aylık Proje Bazında Ödeme Şekli Dağılımı
          </h3>
          {report.monthly_reports.map((monthReport: import('../types/payment.types').MonthlyReport, idx: number) => (
            <div key={monthReport.month} className="mb-8">
              <h4 className="text-md font-bold text-gray-900 mb-2">
                {new Date(monthReport.month).toLocaleDateString('tr-TR', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </h4>
              <div className="flex w-full gap-6" style={{width: '100%'}}>
                {/* MKM Payment Methods */}
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">MKM</h5>
                  <div className="overflow-y-auto" style={{maxHeight: '240px'}}>
                    <table className="w-full divide-y divide-gray-200 border border-gray-300 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 border border-gray-300">Ödeme Nedeni</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border border-gray-300">Toplam TL</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border border-gray-300">Toplam USD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['Banka Havalesi', 'Nakit', 'Çek'].map((method) => {
                          const methodData = monthReport.mkm_payment_methods?.[method] || { tl: 0, usd: 0, total_usd: 0 };
                          return (
                            <tr key={method}>
                              <td className="px-2 py-2 border border-gray-300">{method}</td>
                              <td className="px-2 py-2 text-center border border-gray-300">{formatAmountUSDPlain(methodData.tl)}</td>
                              <td className="px-2 py-2 text-center border border-gray-300">{formatAmountUSDPlain(methodData.usd)}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-100 font-semibold">
                          <td className="px-2 py-2 border border-gray-300">Genel Toplam</td>
                          <td className="px-2 py-2 text-center border border-gray-300">{formatAmountUSDPlain(Object.values(monthReport.mkm_payment_methods || {}).reduce((sum, method) => sum + (method as import('../types/payment.types').PaymentMethodTotal).tl, 0))}</td>
                          <td className="px-2 py-2 text-center border border-gray-300">{formatAmountUSDPlain(Object.values(monthReport.mkm_payment_methods || {}).reduce((sum, method) => sum + (method as import('../types/payment.types').PaymentMethodTotal).usd, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* MSM Payment Methods */}
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">MSM</h5>
                  <div className="overflow-y-auto" style={{maxHeight: '240px'}}>
                    <table className="w-full divide-y divide-gray-200 border border-gray-300 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 border border-gray-300">Ödeme Nedeni</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border border-gray-300">Toplam TL</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border border-gray-300">Toplam USD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['Banka Havalesi', 'Nakit', 'Çek'].map((method) => {
                          const methodData = monthReport.msm_payment_methods?.[method] || { tl: 0, usd: 0, total_usd: 0 };
                          return (
                            <tr key={method}>
                              <td className="px-2 py-2 border border-gray-300">{method}</td>
                              <td className="px-2 py-2 text-center border border-gray-300">{formatAmountUSDPlain(methodData.tl)}</td>
                              <td className="px-2 py-2 text-center border border-gray-300">{formatAmountUSDPlain(methodData.usd)}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-100 font-semibold">
                          <td className="px-2 py-2 border border-gray-300">Toplam</td>
                          <td className="px-2 py-2 text-center border border-gray-300">{formatAmountUSDPlain(Object.values(monthReport.msm_payment_methods || {}).reduce((sum, method) => sum + (method as import('../types/payment.types').PaymentMethodTotal).tl, 0))}</td>
                          <td className="px-2 py-2 text-center border border-gray-300">{formatAmountUSDPlain(Object.values(monthReport.msm_payment_methods || {}).reduce((sum, method) => sum + (method as import('../types/payment.types').PaymentMethodTotal).usd, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* GENEL Payment Methods */}
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">GENEL</h5>
                  <div className="overflow-y-auto" style={{maxHeight: '240px'}}>
                    <table className="w-full divide-y divide-gray-200 border border-gray-300 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 border border-gray-300">Ödeme Nedeni</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border border-gray-300">Toplam TL</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border border-gray-300">Toplam USD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['Banka Havalesi', 'Nakit', 'Çek'].map((method) => {
                          const mkmData = monthReport.mkm_payment_methods?.[method] || { tl: 0, usd: 0, total_usd: 0 };
                          const msmData = monthReport.msm_payment_methods?.[method] || { tl: 0, usd: 0, total_usd: 0 };
                          const combinedTL = mkmData.tl + msmData.tl;
                          const combinedUSD = mkmData.usd + msmData.usd;
                          return (
                            <tr key={method}>
                              <td className="px-2 py-2 border border-gray-300">{method}</td>
                              <td className="px-2 py-2 text-center border border-gray-300">{formatAmountUSDPlain(combinedTL)}</td>
                              <td className="px-2 py-2 text-center border border-gray-300">{formatAmountUSDPlain(combinedUSD)}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-100 font-semibold">
                          <td className="px-2 py-2 border border-gray-300">Toplam</td>
                          <td className="px-2 py-2 text-center border border-gray-300">{formatAmountUSDPlain(
                            Object.values(monthReport.mkm_payment_methods || {}).reduce((sum, method) => sum + (method as import('../types/payment.types').PaymentMethodTotal).tl, 0) +
                            Object.values(monthReport.msm_payment_methods || {}).reduce((sum, method) => sum + (method as import('../types/payment.types').PaymentMethodTotal).tl, 0)
                          )}</td>
                          <td className="px-2 py-2 text-center border border-gray-300">{formatAmountUSDPlain(
                            Object.values(monthReport.mkm_payment_methods || {}).reduce((sum, method) => sum + (method as import('../types/payment.types').PaymentMethodTotal).usd, 0) +
                            Object.values(monthReport.msm_payment_methods || {}).reduce((sum, method) => sum + (method as import('../types/payment.types').PaymentMethodTotal).usd, 0)
                          )}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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