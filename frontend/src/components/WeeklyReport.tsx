import React from 'react';
import { WeeklyReport as WeeklyReportType } from '../types/payment.types';
import { formatAmountUSD, formatAmountTL, formatAmountUSDPlain, formatAmountTLPlain } from '../utils/formatters';
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

      {/* Daily Collections Summary Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Günlük Tahsilat Özeti (USD) - Aylık Görünüm
        </h3>
        
        <div className="overflow-x-auto">
          {(() => {
            // Get the month and year from the week start date
            const startDate = new Date(report.start_date);
            const year = startDate.getFullYear();
            const month = startDate.getMonth();
            
            // Calculate daily totals from payments data
            const dailyTotals: Record<string, number> = {};
            report.payments.forEach(payment => {
              const dateKey = payment.payment_date.split('T')[0]; // Get YYYY-MM-DD part
              dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + payment.amount_usd;
            });
            
            // Get the number of days in the month
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            // Create calendar grid (7 columns x multiple rows)
            const weeks = [];
            let currentWeek = [];
            
            // Fill the calendar
            for (let day = 1; day <= daysInMonth; day++) {
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const amount = dailyTotals[dateKey] || 0;
              const monthDate = new Date(year, month, day);
              
              currentWeek.push({
                day,
                dateKey,
                amount,
                displayDate: `${String(day).padStart(2, '0')}-${monthDate.toLocaleDateString('tr-TR', { month: 'short' })}-${String(year).slice(-2)}`
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
            
            // Calculate grand total for the month
            const grandTotal = Object.values(dailyTotals).reduce((sum, amount) => sum + amount, 0);
            
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
                          <div className="text-gray-900">HAFTALIK TOPLAM</div>
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
                      Aylık Genel Toplam
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
                      {formatAmountUSDPlain(amount)}
                    </td>
                  </tr>
                ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                  TOPLAM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                  {formatAmountUSDPlain(totalCustomerUSD)}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountTLPlain(totals.tl)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSDPlain(totals.usd)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSDPlain(totals.total_usd)}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">Genel Toplam</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountTLPlain(totalMethodTL)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSDPlain(totalMethodUSD)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSDPlain(Object.values(report.payment_methods).reduce((sum, method) => sum + method.total_usd, 0))}</td>
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSDPlain(report.project_summary.mkm)}</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">HAFTALIK MSM</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSDPlain(report.project_summary.msm)}</td>
              </tr>
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">TOPLAM</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSDPlain(totalProjectUSD)}</td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSDPlain(totals.mkm)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSDPlain(totals.msm)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSDPlain(totals.total)}</td>
                </tr>
              ))}
              {/* Project Totals Row */}
              <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border border-gray-300">TOPLAM</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border border-gray-300">
                  {formatAmountUSDPlain(Object.values(report.location_summary).reduce((sum, loc) => sum + loc.mkm, 0))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border border-gray-300">
                  {formatAmountUSDPlain(Object.values(report.location_summary).reduce((sum, loc) => sum + loc.msm, 0))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border border-gray-300">
                  {formatAmountUSDPlain(Object.values(report.location_summary).reduce((sum, loc) => sum + loc.total, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly ÇEK Payments Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          HAFTALIK ÇEK TAHSİLATLARI (ÇEK ÖDEMELERİ)
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">No</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Müşteri</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Proje</th>
                {Array.from({length: 7}).map((_, i) => {
                  const dayNames = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CTS', 'PAZ'];
                  const startDate = new Date(report.start_date);
                  const dayDate = new Date(startDate);
                  dayDate.setDate(startDate.getDate() + i);
                  return (
                    <th key={i} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      {dayNames[i]}<br/>{dayDate.toLocaleDateString('tr-TR', {day:'2-digit', month:'2-digit', year:'numeric'})}
                    </th>
                  );
                })}
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Toplam TL</th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Toplam USD</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                // Filter only ÇEK payments
                const cekPayments = (report.payments ?? []).filter(p => p.payment_method === 'Çek' || p.location === 'ÇEK');
                
                // Group by customer
                const customerCekSummary = cekPayments.reduce((acc, payment) => {
                  if (!acc[payment.customer_name]) {
                    acc[payment.customer_name] = {
                      totalTL: 0,
                      totalUSD: 0,
                      project: payment.project,
                      dailyAmountsTL: Array(7).fill(0),
                      dailyAmountsUSD: Array(7).fill(0)
                    };
                  }
                  
                  const paymentDate = new Date(payment.payment_date);
                  const weekStart = new Date(report.start_date);
                  const weekEnd = new Date(report.end_date);
                  
                  if (paymentDate >= weekStart && paymentDate <= weekEnd) {
                    const dayIndex = paymentDate.getDay() === 0 ? 6 : paymentDate.getDay() - 1;
                    if (dayIndex >= 0 && dayIndex < 7) {
                      if (payment.currency === 'TL') {
                        acc[payment.customer_name].dailyAmountsTL[dayIndex] += payment.amount;
                        acc[payment.customer_name].totalTL += payment.amount;
                      } else {
                        acc[payment.customer_name].dailyAmountsUSD[dayIndex] += payment.amount;
                      }
                      
                      // Always add USD equivalent for totals
                      acc[payment.customer_name].totalUSD += payment.amount_usd;
                    }
                  }
                  
                  return acc;
                }, {} as Record<string, any>);

                return Object.entries(customerCekSummary)
                  .sort(([,a], [,b]) => b.totalUSD - a.totalUSD)
                  .map(([customer, data], idx) => (
                    <tr key={customer} className="hover:bg-gray-50">
                      <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{idx + 1}</td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{customer}</td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">{data.project}</td>
                      {Array.from({length: 7}).map((_, dayIndex) => {
                        const tlAmount = data.dailyAmountsTL[dayIndex];
                        const usdAmount = data.dailyAmountsUSD[dayIndex];
                        let displayValue = '';
                        
                        if (tlAmount > 0 && usdAmount > 0) {
                          displayValue = `${formatAmountTLPlain(tlAmount)} / ${formatAmountUSDPlain(usdAmount)}`;
                        } else if (tlAmount > 0) {
                          displayValue = `${formatAmountTLPlain(tlAmount)}`;
                        } else if (usdAmount > 0) {
                          displayValue = `${formatAmountUSDPlain(usdAmount)}`;
                        }
                        
                        return (
                          <td key={dayIndex} className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                            {displayValue || '-'}
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                        {formatAmountTLPlain(data.totalTL)}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                        {formatAmountUSDPlain(data.totalUSD)}
                      </td>
                    </tr>
                  ));
              })()}
              
              {/* Total row for ÇEK payments */}
              <tr className="bg-gray-100 font-semibold">
                <td colSpan={3} className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right border border-gray-300">TOPLAM</td>
                {Array.from({length: 7}).map((_, dayIndex) => {
                  const cekPayments = (report.payments ?? []).filter(p => p.payment_method === 'Çek' || p.location === 'ÇEK');
                  let dayTotalTL = 0;
                  let dayTotalUSD = 0;
                  
                  cekPayments.forEach(payment => {
                    const paymentDate = new Date(payment.payment_date);
                    const weekStart = new Date(report.start_date);
                    const weekEnd = new Date(report.end_date);
                    if (paymentDate >= weekStart && paymentDate <= weekEnd) {
                      const pDayIndex = paymentDate.getDay() === 0 ? 6 : paymentDate.getDay() - 1;
                      if (pDayIndex === dayIndex) {
                        if (payment.currency === 'TL') {
                          dayTotalTL += payment.amount;
                        } else {
                          dayTotalUSD += payment.amount;
                        }
                      }
                    }
                  });
                  
                  let displayValue = '';
                  if (dayTotalTL > 0 && dayTotalUSD > 0) {
                    displayValue = `${formatAmountTLPlain(dayTotalTL)} / ${formatAmountUSDPlain(dayTotalUSD)}`;
                  } else if (dayTotalTL > 0) {
                    displayValue = `${formatAmountTLPlain(dayTotalTL)}`;
                  } else if (dayTotalUSD > 0) {
                    displayValue = `${formatAmountUSDPlain(dayTotalUSD)}`;
                  }
                  
                  return (
                    <td key={dayIndex} className="px-2 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-semibold border border-gray-300">
                      {displayValue || '-'}
                    </td>
                  );
                })}
                <td className="px-2 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-semibold border border-gray-300">
                  {formatAmountTLPlain((report.payments ?? []).filter(p => p.payment_method === 'Çek' || p.location === 'ÇEK').reduce((sum, p) => p.currency === 'TL' ? sum + p.amount : sum, 0))}
                </td>
                <td className="px-2 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-semibold border border-gray-300">
                  {formatAmountUSDPlain((report.payments ?? []).filter(p => p.payment_method === 'Çek' || p.location === 'ÇEK').reduce((sum, p) => sum + p.amount_usd, 0))}
                </td>
              </tr>
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
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Proje</th>
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
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">GENEL TOPLAM (USD)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(report.customer_summary)
                .sort(([, a], [, b]) => b - a)
                .map(([customer, amount], idx) => {
                  // Find all payments for this customer in this week
                  const customerPayments = (report.payments ?? []).filter(p => p.customer_name === customer);
                  
                  // Determine the dominant project for this customer (most common project)
                  const projectCounts = customerPayments.reduce((acc, payment) => {
                    acc[payment.project] = (acc[payment.project] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  const dominantProject = Object.entries(projectCounts)
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'MKM';
                  
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
                  
                  // Calculate grand total for this customer (sum of all daily amounts)
                  const grandTotal = dailyAmounts.reduce((sum, amt) => sum + amt, 0);
                  
                  return (
                    <tr key={customer} className="hover:bg-gray-50">
                      <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{idx + 1}</td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{customer}</td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">{dominantProject}</td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{formatAmountUSDPlain(amount)}</td>
                      {dailyAmounts.map((amt, i) => (
                        <td key={i} className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-900 border border-gray-300">
                          {amt > 0 ? formatAmountUSDPlain(amt) : ''}
                        </td>
                      ))}
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-900 font-semibold border border-gray-300">
                        {formatAmountUSDPlain(grandTotal)}
                      </td>
                    </tr>
                  );
                })}
              {/* Total row */}
              <tr className="bg-gray-100 font-semibold">
                <td colSpan={4} className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right border border-gray-300">TOPLAM</td>
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
                      {dayTotal > 0 ? formatAmountUSDPlain(dayTotal) : ''}
                    </td>
                  );
                })}
                <td className="px-2 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-semibold border border-gray-300">
                  {formatAmountUSDPlain((report.payments ?? []).reduce((sum, payment) => {
                    const paymentDate = new Date(payment.payment_date);
                    const weekStart = new Date(report.start_date);
                    const weekEnd = new Date(report.end_date);
                    if (paymentDate >= weekStart && paymentDate <= weekEnd) {
                      return sum + payment.amount_usd;
                    }
                    return sum;
                  }, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
