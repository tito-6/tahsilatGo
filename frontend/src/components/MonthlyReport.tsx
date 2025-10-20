import React from 'react';
import { MonthlyReport as MonthlyReportType, PaymentRecord } from '../types/payment.types';
import { formatAmountUSDPlain } from '../utils/formatters';
import { formatMonth } from '../utils/dateHelpers';

interface MonthlyReportProps {
  report: MonthlyReportType;
  allPayments: PaymentRecord[];
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ report, allPayments }) => {
  const totalProjectUSD = report.project_summary.mkm + report.project_summary.msm;
  const totalLocationUSD = Object.values(report.location_summary).reduce((sum, location) => sum + location.total, 0);
  
  // Get the month name in Turkish for dynamic headers
  const monthName = new Date(report.month).toLocaleDateString('tr-TR', { month: 'long' }).toUpperCase();

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

      {/* Daily USD Collection Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Günlük USD Tahsilat Toplamları
        </h3>
        <div className="overflow-x-auto">
          {(() => {
            // Get the month and year from the report
            const reportDate = new Date(report.month);
            const year = reportDate.getFullYear();
            const month = reportDate.getMonth();
            
            // Get the number of days in the month
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            // Create calendar grid (7 columns x multiple rows)
            const weeks = [];
            let currentWeek = [];
            
            // Fill the calendar
            for (let day = 1; day <= daysInMonth; day++) {
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const amount = report.daily_totals?.[dateKey] || 0;
              
              currentWeek.push({
                day,
                dateKey,
                amount,
                displayDate: `${String(day).padStart(2, '0')}-${reportDate.toLocaleDateString('tr-TR', { month: 'short' })}-${String(year).slice(-2)}`
              });
              
              // If we have 7 days or reached the end of month, complete the week
              if (currentWeek.length === 7 || day === daysInMonth) {
                // Fill remaining slots with empty cells if needed
                while (currentWeek.length < 7) {
                  currentWeek.push(null);
                }
                weeks.push([...currentWeek]);
                currentWeek = [];
              }
            }
            
            // Calculate grand total
            const grandTotal = Object.values(report.daily_totals || {}).reduce((sum, amount) => sum + amount, 0);
            
            return (
              <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                <tbody className="bg-white">
                  {weeks.map((week, weekIndex) => (
                    <React.Fragment key={weekIndex}>
                      <tr>
                        {week.map((dayData, dayIndex) => (
                          <td key={dayIndex} className="px-4 py-3 text-center text-sm border border-gray-300 min-w-[120px]">
                            {dayData ? (
                              <div>
                                <div className="font-medium text-gray-900">{dayData.displayDate}</div>
                                <div className="text-gray-600 mt-1">
                                  {dayData.amount > 0 ? formatAmountUSDPlain(dayData.amount) : '-'}
                                </div>
                              </div>
                            ) : (
                              <div className="h-12"></div>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center text-sm font-semibold bg-gray-100 border border-gray-300">
                          <div className="text-gray-900">TOPLAM</div>
                          <div className="mt-1">
                            {week.filter(d => d && d.amount > 0).reduce((sum, d) => sum + (d?.amount || 0), 0) > 0 
                              ? formatAmountUSDPlain(week.filter(d => d && d.amount > 0).reduce((sum, d) => sum + (d?.amount || 0), 0))
                              : '-'
                            }
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                  {/* Grand Total Row */}
                  <tr className="bg-gray-200">
                    <td colSpan={7} className="px-4 py-4 text-center text-sm font-bold text-gray-900 border border-gray-300">
                      Genel Toplam
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 border border-gray-300">
                      {formatAmountUSDPlain(grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>

      {/* Monthly Check Payments Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          AYLIK ÇEK TAHSİLATLARI (ÇEK ÖDEMELERİ)
        </h3>
        <div className="overflow-x-auto">
          {(() => {
            // Get the month and year from the report
            const reportDate = new Date(report.month);
            const year = reportDate.getFullYear();
            const month = reportDate.getMonth();
            
            // Filter payments to get only check payments for this month
            const checkPayments = allPayments.filter(payment => {
              const paymentDate = new Date(payment.payment_date);
              return (
                payment.payment_method === 'Çek' &&
                paymentDate.getFullYear() === year &&
                paymentDate.getMonth() === month
              );
            });

            // Group check payments by customer and project
            const groupedPayments = checkPayments.reduce((acc, payment) => {
              const key = `${payment.customer_name}_${payment.project}`;
              if (!acc[key]) {
                acc[key] = {
                  customer: payment.customer_name,
                  project: payment.project,
                  totalTL: 0,
                  totalUSD: 0,
                  payments: []
                };
              }
              acc[key].totalTL += payment.currency === 'TL' ? payment.amount : 0;
              acc[key].totalUSD += payment.amount_usd;
              acc[key].payments.push(payment);
              return acc;
            }, {} as Record<string, any>);

            const groupedPaymentsList = Object.values(groupedPayments);
            
            // Calculate grand totals
            const grandTotalTL = groupedPaymentsList.reduce((sum, group) => sum + group.totalTL, 0);
            const grandTotalUSD = groupedPaymentsList.reduce((sum, group) => sum + group.totalUSD, 0);

            if (groupedPaymentsList.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  Bu ay için çek ödemesi bulunmamaktadır.
                </div>
              );
            }

            return (
              <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      No
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Müşteri
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Proje
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Toplam TL
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Toplam USD
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Ödeme Sayısı
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupedPaymentsList.map((group, index) => {
                    // Check if this customer has any KDV payments in this month
                    const hasKdvPayments = group.payments.some((payment: PaymentRecord) => payment.includes_kdv);
                    
                    return (
                      <tr key={`${group.customer}_${group.project}`} className={`hover:bg-gray-50 ${hasKdvPayments ? 'bg-orange-50 border-orange-200' : ''}`}>
                        <td className="px-3 py-2 text-center text-sm text-gray-900 border border-gray-300">
                          {index + 1}
                        </td>
                        <td className={`px-6 py-2 text-left text-sm border border-gray-300 ${hasKdvPayments ? 'text-orange-800' : 'text-gray-900'}`}>
                          {group.customer}
                          {hasKdvPayments && <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">KDV</span>}
                        </td>
                        <td className="px-3 py-2 text-center text-sm text-gray-900 border border-gray-300">
                          {group.project}
                        </td>
                        <td className="px-4 py-2 text-center text-sm font-medium text-gray-900 border border-gray-300">
                          {formatAmountUSDPlain(group.totalTL)}
                        </td>
                        <td className="px-4 py-2 text-center text-sm font-medium text-gray-900 border border-gray-300">
                          {formatAmountUSDPlain(group.totalUSD)}
                        </td>
                        <td className="px-4 py-2 text-center text-sm text-gray-900 border border-gray-300">
                          {group.payments.length}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-gray-100 font-semibold">
                    <td className="px-3 py-2 text-center text-sm text-gray-900 border border-gray-300">
                      
                    </td>
                    <td className="px-6 py-2 text-left text-sm text-gray-900 border border-gray-300">
                      TOPLAM
                    </td>
                    <td className="px-3 py-2 text-center text-sm text-gray-900 border border-gray-300">
                      
                    </td>
                    <td className="px-4 py-2 text-center text-sm font-bold text-gray-900 border border-gray-300">
                      {formatAmountUSDPlain(grandTotalTL)}
                    </td>
                    <td className="px-4 py-2 text-center text-sm font-bold text-gray-900 border border-gray-300">
                      {formatAmountUSDPlain(grandTotalUSD)}
                    </td>
                    <td className="px-4 py-2 text-center text-sm font-bold text-gray-900 border border-gray-300">
                      {checkPayments.length}
                    </td>
                  </tr>
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>

      {/* Payment Method Breakdown by Project */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Proje Bazında Ödeme Şekli Dağılımı
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MKM Project */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">
              {monthName} AYI MKM TAHSİLATLAR
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

          {/* MSM Project */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">
              {monthName} AYI MSM TAHSİLATLAR
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
                  <tr className="bg-gray-100 font-semibold">
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                      Genel Toplam
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
              {monthName} AYI GENEL
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
                  {formatAmountUSDPlain(report.project_summary.mkm)}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                  AYLIK MSM
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
                    {formatAmountUSDPlain(totals.mkm)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                    {formatAmountUSDPlain(totals.msm)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                    {formatAmountUSDPlain(totals.total)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                  TOPLAM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSDPlain(
                    Object.values(report.location_summary).reduce((sum, location) => sum + location.mkm, 0)
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSDPlain(
                    Object.values(report.location_summary).reduce((sum, location) => sum + location.msm, 0)
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSDPlain(totalLocationUSD)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* KDV Notes Section */}
      {(() => {
        // Find all payments with KDV in this month
        const reportDate = new Date(report.month);
        const year = reportDate.getFullYear();
        const month = reportDate.getMonth();
        
        const kdvPayments = allPayments.filter(payment => {
          const paymentDate = new Date(payment.payment_date);
          const hasKdv = (
            payment.includes_kdv &&
            paymentDate.getFullYear() === year &&
            paymentDate.getMonth() === month
          );
          
          // Debug logging
          if (payment.includes_kdv) {
            console.log('Found KDV payment in month:', {
              customer: payment.customer_name,
              includes_kdv: payment.includes_kdv,
              kdv_amount: payment.kdv_amount,
              kdv_rate: payment.kdv_rate,
              kdv_note: payment.kdv_note,
              payment_date: payment.payment_date,
              paymentYear: paymentDate.getFullYear(),
              paymentMonth: paymentDate.getMonth(),
              reportYear: year,
              reportMonth: month,
              inMonthRange: hasKdv
            });
          }
          
          return hasKdv;
        });

        console.log('KDV payments found for month:', kdvPayments.length, kdvPayments);

        if (kdvPayments.length === 0) return null;

        return (
          <div className="mt-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="text-md font-semibold text-orange-800 mb-3">
              ⚠️ KDV DAHİL ÖDEMELER - MODEL KUYUM-MODEL SANAYİ MERKEZİ TAHSİLATLAR TABLOSU
            </h4>
            <div className="space-y-2 text-sm">
              {kdvPayments.map((payment, index) => (
                <div key={payment.id || index} className="flex flex-wrap items-center gap-2 text-orange-700">
                  <span className="font-medium">{payment.customer_name}</span>
                  <span>-</span>
                  <span>{formatAmountUSDPlain(payment.amount)} {payment.currency}</span>
                  <span>-</span>
                  <span>KDV: {formatAmountUSDPlain(payment.kdv_amount || 0)} {payment.currency}</span>
                  <span>(%{payment.kdv_rate || 0})</span>
                  {payment.kdv_note && (
                    <>
                      <span>-</span>
                      <span className="italic">{payment.kdv_note}</span>
                    </>
                  )}
                </div>
              ))}
              <p className="text-xs text-orange-600 mt-2 italic">
                * Bu ödemeler KDV dahil tutarları göstermektedir. Aylık raporlama sırasında dikkate alınmalıdır.
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
