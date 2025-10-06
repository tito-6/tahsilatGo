import React from 'react';
import { WeeklyReport as WeeklyReportType } from '../types/payment.types';
import { formatDate, formatAmountUSD, formatAmountTL } from '../utils/formatters';
import { formatWeekRange } from '../utils/dateHelpers';

interface WeeklyReportProps {
  report: WeeklyReportType;
  weekNumber: number;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ report, weekNumber }) => {
  const totalCustomerUSD = Object.values(report.customer_summary).reduce((sum, amount) => sum + amount, 0);
  const totalMethodTL = Object.values(report.payment_methods).reduce((sum, method) => sum + method.tl, 0);
  const totalMethodUSD = Object.values(report.payment_methods).reduce((sum, method) => sum + method.usd, 0);
  const totalProjectUSD = report.project_summary.mkm + report.project_summary.msm;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Hafta {weekNumber}
        </h2>
        <p className="text-gray-600">
          {formatWeekRange(report.start_date, report.end_date)}
        </p>
      </div>

      {/* Customer Summary Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          MODEL KUYUM-MODEL SANAYİ MERKEZİ TAHSİLATLAR TABLOSU {formatWeekRange(report.start_date, report.end_date)}
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                  MÜŞTERİ ADI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                  TOPLAM (USD)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(report.customer_summary)
                .sort(([, a], [, b]) => b - a)
                .map(([customer, amount]) => (
                  <tr key={customer} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                      {customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                      {formatAmountUSD(amount)}
                    </td>
                  </tr>
                ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                  TOPLAM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSD(totalCustomerUSD)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Method Summary Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Ödeme Şekli Özeti
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Ödeme Şekli</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Toplam TL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Toplam USD</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Genel Toplam (USD)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(report.payment_methods).map(([method, totals]) => (
                <tr key={method} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{method}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountTL(totals.tl)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSD(totals.usd)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSD(totals.total_usd)}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">Genel Toplam</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountTL(totalMethodTL)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSD(totalMethodUSD)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSD(Object.values(report.payment_methods).reduce((sum, method) => sum + method.total_usd, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Summary Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Proje Özeti
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Proje</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Tutar (USD)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">HAFTALIK MKM</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSD(report.project_summary.mkm)}</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">HAFTALIK MSM</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSD(report.project_summary.msm)}</td>
              </tr>
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">TOPLAM</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSD(totalProjectUSD)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Location Summary Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Lokasyon Bazlı Özet
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Lokasyon/Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">MKM HAFTALIK (USD)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">MSM HAFTALIK (USD)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">TOPLAM (USD)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(report.location_summary).map(([location, totals]) => (
                <tr key={location} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSD(totals.mkm)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSD(totals.msm)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSD(totals.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Weekly Report Table with Day Columns */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          MODEL KUYUM-MODEL SANAYİ MERKEZİ TAHSİLATLAR TABLOSU {formatWeekRange(report.start_date, report.end_date)}
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Sıra No</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Müşteri Adı</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">TOPLAM (USD)</th>
                {Array.from({length: 7}).map((_, i) => {
                  const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
                  const startDate = new Date(report.start_date);
                  const dayDate = new Date(startDate);
                  dayDate.setDate(startDate.getDate() + i);
                  return (
                    <th key={i} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      {dayNames[i]}<br/>{dayDate.toLocaleDateString('tr-TR', {day:'2-digit', month:'2-digit', year:'numeric'})}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(report.customer_summary)
                .sort(([, a], [, b]) => b - a)
                .map(([customer, amount], idx) => {
                  // Find all payments for this customer in this week
                  const customerPayments = (report.payments ?? []).filter(p => p.customer_name === customer);
                  // Group payments by day and sum amounts for each day
                  const dailyAmounts = Array(7).fill(0);
                  customerPayments.forEach(payment => {
                    const paymentDate = new Date(payment.payment_date);
                    const weekStart = new Date(report.start_date);
                    const weekEnd = new Date(report.end_date);
                    if (paymentDate >= weekStart && paymentDate <= weekEnd) {
                      const dayIndex = paymentDate.getDay() === 0 ? 6 : paymentDate.getDay() - 1; // Monday=0, Sunday=6
                      if (dayIndex >= 0 && dayIndex < 7) {
                        dailyAmounts[dayIndex] += payment.amount_usd;
                      }
                    }
                  });
                  return (
                    <tr key={customer} className="hover:bg-gray-50">
                      <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{idx + 1}</td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{customer}</td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSD(amount)}</td>
                      {dailyAmounts.map((amt, i) => (
                        <td key={i} className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                          {amt > 0 ? formatAmountUSD(amt) : ''}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              {/* Total row */}
              <tr className="bg-gray-100 font-semibold">
                <td colSpan={3} className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right border border-gray-300">TOPLAM</td>
                {Array.from({length: 7}).map((_, dayIndex) => {
                  const dayTotal = (report.payments ?? []).reduce((sum, payment) => {
                    const paymentDate = new Date(payment.payment_date);
                    const weekStart = new Date(report.start_date);
                    const weekEnd = new Date(report.end_date);
                    if (paymentDate >= weekStart && paymentDate <= weekEnd) {
                      const pDayIndex = paymentDate.getDay() === 0 ? 6 : paymentDate.getDay() - 1;
                      if (pDayIndex === dayIndex) {
                        return sum + payment.amount_usd;
                      }
                    }
                    return sum;
                  }, 0);
                  return (
                    <td key={dayIndex} className="px-2 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-semibold border border-gray-300">
                      {dayTotal > 0 ? formatAmountUSD(dayTotal) : ''}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
