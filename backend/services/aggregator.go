package services

import (
	"fmt"
	"sort"
	"strings"
	"tahsilat-raporu/models"
	"time"
)

// GenerateWeeklyReports creates weekly reports from payment records
// For cross-month weeks, it creates separate reports for each month portion
func GenerateWeeklyReports(payments []models.PaymentRecord) []models.WeeklyReport {
	weekMap := make(map[string][]models.PaymentRecord)

	// Group payments by week-month combination to handle cross-month weeks
	for _, payment := range payments {
		weekStart := getWeekStart(payment.PaymentDate)
		weekEnd := weekStart.AddDate(0, 0, 6)
		
		// If week spans multiple months, use month-specific key
		if weekStart.Month() != weekEnd.Month() {
			// Use payment's month for the key to separate cross-month weeks
			monthKey := payment.PaymentDate.Format("2006-01")
			key := fmt.Sprintf("%s-%s", weekStart.Format("2006-01-02"), monthKey)
			weekMap[key] = append(weekMap[key], payment)
		} else {
			// Normal single-month week
			key := weekStart.Format("2006-01-02")
			weekMap[key] = append(weekMap[key], payment)
		}
	}

	var reports []models.WeeklyReport
	for key, weekPayments := range weekMap {
		if len(weekPayments) > 0 {
			report := aggregateWeek(weekPayments)
			
			// For cross-month weeks, adjust the date range to match the actual payment dates
			if strings.Contains(key, "-") {
				// This is a cross-month week portion
				parts := strings.Split(key, "-")
				if len(parts) >= 4 {
					// Find the actual date range for payments in this month portion
					var minDate, maxDate time.Time
					for i, payment := range weekPayments {
						if i == 0 {
							minDate = payment.PaymentDate
							maxDate = payment.PaymentDate
						} else {
							if payment.PaymentDate.Before(minDate) {
								minDate = payment.PaymentDate
							}
							if payment.PaymentDate.After(maxDate) {
								maxDate = payment.PaymentDate
							}
						}
					}
					
					// Adjust the report dates to reflect the actual range for this month portion
					weekStart := getWeekStart(weekPayments[0].PaymentDate)
					weekEnd := weekStart.AddDate(0, 0, 6)
					
					// If this is the earlier month portion, end date should be last day of month
					if minDate.Month() < weekEnd.Month() {
						lastDayOfMonth := time.Date(minDate.Year(), minDate.Month()+1, 0, 23, 59, 59, 0, minDate.Location())
						report.EndDate = lastDayOfMonth
					}
					// If this is the later month portion, start date should be first day of month  
					if maxDate.Month() > weekStart.Month() {
						firstDayOfMonth := time.Date(maxDate.Year(), maxDate.Month(), 1, 0, 0, 0, 0, maxDate.Location())
						report.StartDate = firstDayOfMonth
					}
				}
			}
			
			reports = append(reports, report)
		}
	}

	// Sort reports by start date
	sort.Slice(reports, func(i, j int) bool {
		return reports[i].StartDate.Before(reports[j].StartDate)
	})

	return reports
}

// GenerateMonthlyReports creates monthly reports from payment records
func GenerateMonthlyReports(payments []models.PaymentRecord) []models.MonthlyReport {
	monthMap := make(map[string][]models.PaymentRecord)

	// Group payments by month
	for _, payment := range payments {
		monthKey := payment.PaymentDate.Format("2006-01")
		monthMap[monthKey] = append(monthMap[monthKey], payment)
	}

	var reports []models.MonthlyReport
	for _, monthPayments := range monthMap {
		report := aggregateMonth(monthPayments)
		reports = append(reports, report)
	}

	// Sort reports by month
	sort.Slice(reports, func(i, j int) bool {
		return reports[i].Month.Before(reports[j].Month)
	})

	return reports
}

// aggregateWeek aggregates payments for a single week
func aggregateWeek(payments []models.PaymentRecord) models.WeeklyReport {
	if len(payments) == 0 {
		return models.WeeklyReport{}
	}

	// Get week start and end dates
	weekStart := getWeekStart(payments[0].PaymentDate)
	weekEnd := weekStart.AddDate(0, 0, 6)

	report := models.WeeklyReport{
		StartDate:       weekStart,
		EndDate:         weekEnd,
		CustomerSummary: make(map[string]float64),
		PaymentMethods:  make(map[string]models.PaymentMethodTotal),
		LocationSummary: make(map[string]models.LocationTotal),
		Payments:        payments,
	}

	// Initialize payment methods
	report.PaymentMethods[models.PaymentMethodCash] = models.PaymentMethodTotal{}
	report.PaymentMethods[models.PaymentMethodTransfer] = models.PaymentMethodTotal{}
	report.PaymentMethods[models.PaymentMethodCheck] = models.PaymentMethodTotal{}

	// Initialize locations
	report.LocationSummary[models.LocationCarşı] = models.LocationTotal{}
	report.LocationSummary[models.LocationKuyumcukent] = models.LocationTotal{}
	report.LocationSummary[models.LocationOfis] = models.LocationTotal{}
	report.LocationSummary[models.LocationBanka] = models.LocationTotal{}
	report.LocationSummary[models.LocationCek] = models.LocationTotal{}

	// Aggregate payments
	for _, payment := range payments {
		// Customer summary
		report.CustomerSummary[payment.CustomerName] += payment.AmountUSD

		// Payment method summary
		if method, exists := report.PaymentMethods[payment.PaymentMethod]; exists {
			// TL column: Only add if original currency is TL
			if payment.Currency == "TL" {
				method.TL += payment.Amount
			}
			// USD column: Add all non-TL payments (already converted to USD)
			if payment.Currency != "TL" {
				method.USD += payment.AmountUSD
			}
			// Total USD: All payments converted to USD (this gives us the grand total)
			method.TotalUSD += payment.AmountUSD
			report.PaymentMethods[payment.PaymentMethod] = method
		}

		// Project summary
		if payment.Project == models.ProjectMKM {
			report.ProjectSummary.MKM += payment.AmountUSD
		} else if payment.Project == models.ProjectMSM {
			report.ProjectSummary.MSM += payment.AmountUSD
		}

		// Location summary based on payment method and account name
		location := getLocationFromPayment(payment)
		if loc, exists := report.LocationSummary[location]; exists {
			if payment.Project == models.ProjectMKM {
				loc.MKM += payment.AmountUSD
			} else if payment.Project == models.ProjectMSM {
				loc.MSM += payment.AmountUSD
			}
			loc.Total += payment.AmountUSD
			report.LocationSummary[location] = loc
		}
	}

	return report
}

// aggregateMonth aggregates payments for a single month
func aggregateMonth(payments []models.PaymentRecord) models.MonthlyReport {
	if len(payments) == 0 {
		return models.MonthlyReport{}
	}

	// Get month from first payment
	month := time.Date(payments[0].PaymentDate.Year(), payments[0].PaymentDate.Month(), 1, 0, 0, 0, 0, time.UTC)

	report := models.MonthlyReport{
		Month:             month,
		LocationSummary:   make(map[string]models.LocationTotal),
		DailyTotals:       make(map[string]float64),
		PaymentMethods:    make(map[string]models.PaymentMethodTotal),
		MKMPaymentMethods: make(map[string]models.PaymentMethodTotal),
		MSMPaymentMethods: make(map[string]models.PaymentMethodTotal),
	}

	// Initialize locations
	report.LocationSummary[models.LocationCarşı] = models.LocationTotal{}
	report.LocationSummary[models.LocationKuyumcukent] = models.LocationTotal{}
	report.LocationSummary[models.LocationOfis] = models.LocationTotal{}
	report.LocationSummary[models.LocationBanka] = models.LocationTotal{}
	report.LocationSummary[models.LocationCek] = models.LocationTotal{}

	// Aggregate payments
	for _, payment := range payments {
		// Daily totals - format date as YYYY-MM-DD
		dateKey := payment.PaymentDate.Format("2006-01-02")
		report.DailyTotals[dateKey] += payment.AmountUSD

		// Project summary
		if payment.Project == models.ProjectMKM {
			report.ProjectSummary.MKM += payment.AmountUSD
		} else if payment.Project == models.ProjectMSM {
			report.ProjectSummary.MSM += payment.AmountUSD
		}

		// Payment method summary
		paymentMethod := payment.PaymentMethod
		// Initialize if not exists
		if _, exists := report.PaymentMethods[paymentMethod]; !exists {
			report.PaymentMethods[paymentMethod] = models.PaymentMethodTotal{}
		}
		method := report.PaymentMethods[paymentMethod]
		if payment.Currency == "TL" {
			method.TL += payment.Amount
		} else {
			method.USD += payment.Amount
		}
		method.TotalUSD += payment.AmountUSD
		report.PaymentMethods[paymentMethod] = method

		// Project-specific payment method summary
		if payment.Project == models.ProjectMKM {
			if _, exists := report.MKMPaymentMethods[paymentMethod]; !exists {
				report.MKMPaymentMethods[paymentMethod] = models.PaymentMethodTotal{}
			}
			mkmMethod := report.MKMPaymentMethods[paymentMethod]
			if payment.Currency == "TL" {
				mkmMethod.TL += payment.Amount
			} else {
				mkmMethod.USD += payment.Amount
			}
			mkmMethod.TotalUSD += payment.AmountUSD
			report.MKMPaymentMethods[paymentMethod] = mkmMethod
		} else if payment.Project == models.ProjectMSM {
			if _, exists := report.MSMPaymentMethods[paymentMethod]; !exists {
				report.MSMPaymentMethods[paymentMethod] = models.PaymentMethodTotal{}
			}
			msmMethod := report.MSMPaymentMethods[paymentMethod]
			if payment.Currency == "TL" {
				msmMethod.TL += payment.Amount
			} else {
				msmMethod.USD += payment.Amount
			}
			msmMethod.TotalUSD += payment.AmountUSD
			report.MSMPaymentMethods[paymentMethod] = msmMethod
		}

		// Location summary based on payment method and account name
		location := getLocationFromPayment(payment)
		if loc, exists := report.LocationSummary[location]; exists {
			if payment.Project == models.ProjectMKM {
				loc.MKM += payment.AmountUSD
			} else if payment.Project == models.ProjectMSM {
				loc.MSM += payment.AmountUSD
			}
			loc.Total += payment.AmountUSD
			report.LocationSummary[location] = loc
		}
	}

	return report
}

// getWeekStart returns the start of the week (Monday) for a given date
func getWeekStart(date time.Time) time.Time {
	// Week starts on Monday
	weekday := date.Weekday()
	if weekday == time.Sunday {
		weekday = 7 // Treat Sunday as 7
	}
	daysToSubtract := int(weekday) - 1 // Monday is 1, so subtract (weekday - 1) days
	weekStart := date.AddDate(0, 0, -daysToSubtract)
	return time.Date(weekStart.Year(), weekStart.Month(), weekStart.Day(), 0, 0, 0, 0, weekStart.Location())
}

// getLocationFromPayment determines location based on payment method and account name
func getLocationFromPayment(payment models.PaymentRecord) string {
	// If payment method is Çek, location should be ÇEK regardless of account name
	if payment.PaymentMethod == models.PaymentMethodCheck {
		return models.LocationCek
	}

	// Otherwise use account-based classification
	return getLocationFromAccount(payment.AccountName)
}

// getLocationFromAccount determines location based on account name
func getLocationFromAccount(accountName string) string {
	// Use the same logic as LocationClassifier for consistency
	accountLower := strings.ToLower(accountName)

	// ÇARŞI - Shopping area accounts
	if strings.Contains(accountLower, "çarşi") ||
		strings.Contains(accountLower, "carsi") {
		return models.LocationCarşı
	}

	// KUYUMCUKENT - Jewelry district
	if strings.Contains(accountLower, "kuyumcukent") {
		return models.LocationKuyumcukent
	}

	// BANKA - Bank transfers
	if strings.Contains(accountLower, "yapi kredi") ||
		strings.Contains(accountLower, "banka") ||
		strings.Contains(accountLower, "havale") {
		return models.LocationBanka
	}

	// ÇEK - Check payments
	if strings.Contains(accountLower, "çek") ||
		strings.Contains(accountLower, "cek") {
		return models.LocationCek
	}

	// OFİS - Office (including cash/kasa)
	if strings.Contains(accountLower, "ofis") ||
		strings.Contains(accountLower, "office") ||
		strings.Contains(accountLower, "kasa") {
		return models.LocationOfis
	}

	// Default to office if not specified
	return models.LocationOfis
}

// GetTotalAmount calculates total amount for a slice of payments
func GetTotalAmount(payments []models.PaymentRecord) float64 {
	total := 0.0
	for _, payment := range payments {
		total += payment.AmountUSD
	}
	return total
}

// GetCustomerTotals returns a map of customer names to their total amounts
func GetCustomerTotals(payments []models.PaymentRecord) map[string]float64 {
	totals := make(map[string]float64)
	for _, payment := range payments {
		totals[payment.CustomerName] += payment.AmountUSD
	}
	return totals
}

// GenerateYearlyReport generates a yearly summary report
func GenerateYearlyReport(payments []models.Payment, year int) models.YearlyReport {
	report := models.YearlyReport{
		Year: year,
		ProjectSummary: models.ProjectTotal{
			MKM: 0,
			MSM: 0,
		},
		LocationSummary:   make(map[string]models.LocationTotal),
		PaymentMethods:    make(map[string]models.PaymentMethodTotal),
		MKMPaymentMethods: make(map[string]models.PaymentMethodTotal),
		MSMPaymentMethods: make(map[string]models.PaymentMethodTotal),
	}

	// Initialize location summaries
	locations := []string{"BANKA HAVALESİ", "CARŞI", "KUYUMCUKENT", "OFİS", "ÇEK"}
	for _, location := range locations {
		report.LocationSummary[location] = models.LocationTotal{
			MKM:   0,
			MSM:   0,
			Total: 0,
		}
	}

	// Initialize payment methods
	paymentMethods := []string{"Banka Havalesi", "Nakit", "Çek"}
	for _, method := range paymentMethods {
		report.PaymentMethods[method] = models.PaymentMethodTotal{}
		report.MKMPaymentMethods[method] = models.PaymentMethodTotal{}
		report.MSMPaymentMethods[method] = models.PaymentMethodTotal{}
	}

	// Process each payment
	for _, payment := range payments {
		// Update project summary
		if payment.Project == models.ProjectMKM {
			report.ProjectSummary.MKM += payment.AmountUSD
		} else if payment.Project == models.ProjectMSM {
			report.ProjectSummary.MSM += payment.AmountUSD
		}

		// Get payment method
		paymentMethod := getPaymentMethodFromString(payment.PaymentMethod)

		// Update general payment methods
		if _, exists := report.PaymentMethods[paymentMethod]; !exists {
			report.PaymentMethods[paymentMethod] = models.PaymentMethodTotal{}
		}
		method := report.PaymentMethods[paymentMethod]
		if payment.Currency == "TL" {
			method.TL += payment.Amount
		} else {
			method.USD += payment.Amount
		}
		method.TotalUSD += payment.AmountUSD
		report.PaymentMethods[paymentMethod] = method

		// Project-specific payment method summary
		if payment.Project == models.ProjectMKM {
			if _, exists := report.MKMPaymentMethods[paymentMethod]; !exists {
				report.MKMPaymentMethods[paymentMethod] = models.PaymentMethodTotal{}
			}
			mkmMethod := report.MKMPaymentMethods[paymentMethod]
			if payment.Currency == "TL" {
				mkmMethod.TL += payment.Amount
			} else {
				mkmMethod.USD += payment.Amount
			}
			mkmMethod.TotalUSD += payment.AmountUSD
			report.MKMPaymentMethods[paymentMethod] = mkmMethod
		} else if payment.Project == models.ProjectMSM {
			if _, exists := report.MSMPaymentMethods[paymentMethod]; !exists {
				report.MSMPaymentMethods[paymentMethod] = models.PaymentMethodTotal{}
			}
			msmMethod := report.MSMPaymentMethods[paymentMethod]
			if payment.Currency == "TL" {
				msmMethod.TL += payment.Amount
			} else {
				msmMethod.USD += payment.Amount
			}
			msmMethod.TotalUSD += payment.AmountUSD
			report.MSMPaymentMethods[paymentMethod] = msmMethod
		}

		// Location summary based on payment method and account name
		location := getLocationFromPayment(models.PaymentRecord{
			ID:            payment.ID,
			CustomerName:  payment.CustomerName,
			Amount:        payment.Amount,
			Currency:      payment.Currency,
			PaymentMethod: payment.PaymentMethod,
			PaymentDate:   payment.PaymentDate,
			AccountName:   payment.AccountName,
			Project:       payment.Project,
			Location:      payment.Location,
			AmountUSD:     payment.AmountUSD,
			ExchangeRate:  payment.ExchangeRate,
			CreatedAt:     payment.CreatedAt,
		})
		if loc, exists := report.LocationSummary[location]; exists {
			if payment.Project == models.ProjectMKM {
				loc.MKM += payment.AmountUSD
			} else if payment.Project == models.ProjectMSM {
				loc.MSM += payment.AmountUSD
			}
			loc.Total += payment.AmountUSD
			report.LocationSummary[location] = loc
		}
	}

	return report
}

func getPaymentMethodFromString(method string) string {
	m := strings.ToLower(strings.TrimSpace(method))
	switch m {
	case "banka havalesi", "havale", "transfer":
		return "Banka Havalesi"
	case "nakit", "cash":
		return "Nakit"
	case "çek", "cheque", "check":
		return "Çek"
	default:
		return method
	}
}
