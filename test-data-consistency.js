// Data consistency test script
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api';

async function testDataConsistency() {
    try {
        console.log('Testing data consistency...');
        
        // Get all payments
        const paymentsResponse = await axios.get(`${API_BASE_URL}/payments`);
        const payments = paymentsResponse.data;
        console.log(`Total payments in database: ${payments.length}`);
        
        // Get reports
        const reportsResponse = await axios.get(`${API_BASE_URL}/reports`);
        const reports = reportsResponse.data;
        console.log(`Weekly reports: ${reports.weekly_reports?.length || 0}`);
        console.log(`Monthly reports: ${reports.monthly_reports?.length || 0}`);
        
        if (reports.weekly_reports && reports.weekly_reports.length > 0) {
            const weeklyReport = reports.weekly_reports[0];
            console.log('\nWeekly Report Analysis:');
            console.log(`Week: ${weeklyReport.start_date} to ${weeklyReport.end_date}`);
            console.log(`Customer summary entries: ${Object.keys(weeklyReport.customer_summary).length}`);
            console.log(`Payments in report: ${weeklyReport.payments?.length || 0}`);
            
            // Calculate totals
            const customerSummaryTotal = Object.values(weeklyReport.customer_summary).reduce((sum, amount) => sum + amount, 0);
            const paymentsTotal = (weeklyReport.payments || []).reduce((sum, payment) => sum + payment.amount_usd, 0);
            
            console.log(`Customer summary total: $${customerSummaryTotal.toFixed(2)}`);
            console.log(`Payments total: $${paymentsTotal.toFixed(2)}`);
            console.log(`Difference: $${Math.abs(customerSummaryTotal - paymentsTotal).toFixed(2)}`);
            
            // Check for duplicates in customer summary
            const customers = Object.keys(weeklyReport.customer_summary);
            const uniqueCustomers = [...new Set(customers)];
            if (customers.length !== uniqueCustomers.length) {
                console.log('WARNING: Duplicate customers found in summary!');
            }
            
            // Analyze daily distributions
            console.log('\nDaily Payment Distribution:');
            const dailyTotals = Array(7).fill(0);
            const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            
            (weeklyReport.payments || []).forEach(payment => {
                const paymentDate = new Date(payment.payment_date);
                const weekStart = new Date(weeklyReport.start_date);
                const weekEnd = new Date(weeklyReport.end_date);
                
                if (paymentDate >= weekStart && paymentDate <= weekEnd) {
                    const dayIndex = paymentDate.getDay() === 0 ? 6 : paymentDate.getDay() - 1;
                    if (dayIndex >= 0 && dayIndex < 7) {
                        dailyTotals[dayIndex] += payment.amount_usd;
                    }
                }
            });
            
            dailyTotals.forEach((total, index) => {
                console.log(`${dayNames[index]}: $${total.toFixed(2)}`);
            });
        }
        
    } catch (error) {
        console.error('Error testing data consistency:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testDataConsistency();