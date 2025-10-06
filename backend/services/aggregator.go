package services

import (
	"sort"
	"strings"
	"tahsilat-raporu/models"
	"time"
)

// GenerateWeeklyReports creates weekly reports from payment records
func GenerateWeeklyReports(payments []models.PaymentRecord) []models.WeeklyReport {
	weekMap := make(map[string][]models.PaymentRecord)

	// Group payments by week
	for _, payment := range payments {
		weekStart := getWeekStart(payment.PaymentDate)
		key := weekStart.Format("2006-01-02")
		weekMap[key] = append(weekMap[key], payment)
	}

	var reports []models.WeeklyReport
	for _, weekPayments := range weekMap {
		report := aggregateWeek(weekPayments)
		reports = append(reports, report)
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
		Month:           month,
		LocationSummary: make(map[string]models.LocationTotal),
	}

	// Initialize locations
	report.LocationSummary[models.LocationCarşı] = models.LocationTotal{}
	report.LocationSummary[models.LocationKuyumcukent] = models.LocationTotal{}
	report.LocationSummary[models.LocationOfis] = models.LocationTotal{}
	report.LocationSummary[models.LocationBanka] = models.LocationTotal{}
	report.LocationSummary[models.LocationCek] = models.LocationTotal{}

	// Aggregate payments
	for _, payment := range payments {
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
