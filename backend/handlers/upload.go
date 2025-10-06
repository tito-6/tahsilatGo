package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"tahsilat-raporu/models"
	"tahsilat-raporu/services"

	"github.com/gin-gonic/gin"
)

// UploadHandler handles file upload and payment processing
type UploadHandler struct {
	db *sql.DB
}

// NewUploadHandler creates a new upload handler
func NewUploadHandler(db *sql.DB) *UploadHandler {
	return &UploadHandler{db: db}
}

// UploadPayments processes uploaded payment data
func (h *UploadHandler) UploadPayments(c *gin.Context) {
	var req models.UploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Invalid request format: %v", err)
		c.JSON(http.StatusBadRequest, models.UploadResponse{
			Success: false,
			Message: "Invalid request format",
			Errors:  []string{err.Error()},
		})
		return
	}

	log.Printf("Received upload request with %d raw payments", len(req.RawPayments))

	if len(req.RawPayments) == 0 {
		c.JSON(http.StatusBadRequest, models.UploadResponse{
			Success: false,
			Message: "No payment data provided",
		})
		return
	}

	// Create payment processor
	processor := services.NewPaymentProcessor()

	// Process all payments
	processedPayments, errors := processor.ProcessBatch(req.RawPayments)
	log.Printf("Processed %d payments with %d errors", len(processedPayments), len(errors))

	// Save processed payments to database
	var savedPayments []models.PaymentRecord
	var duplicateCount int
	for i, payment := range processedPayments {
		if err := h.savePayment(payment); err != nil {
			if strings.Contains(err.Error(), "Duplicate") {
				duplicateCount++
				log.Printf("Skipped duplicate payment: %s", payment.CustomerName)
			} else {
				errors = append(errors, fmt.Sprintf("Database error for %s: %v", payment.CustomerName, err))
			}
			continue
		}
		savedPayments = append(savedPayments, payment)
		log.Printf("Saved payment %d: %s - %s - %.2f %s", i+1, payment.CustomerName, payment.PaymentDate.Format("2006-01-02"), payment.Amount, payment.Currency)
	}

	// Generate reports
	weeklyReports := services.GenerateWeeklyReports(savedPayments)
	log.Printf("Generated %d weekly reports", len(weeklyReports))

	message := fmt.Sprintf("Processed %d payments successfully", len(savedPayments))
	if duplicateCount > 0 {
		message += fmt.Sprintf(" (%d duplicates skipped)", duplicateCount)
	}

	response := models.UploadResponse{
		Success:       len(savedPayments) > 0 || duplicateCount > 0,
		Message:       message,
		Processed:     len(savedPayments),
		Errors:        errors,
		WeeklyReports: weeklyReports,
	}

	if len(savedPayments) == 0 && duplicateCount == 0 {
		response.Success = false
		response.Message = "No payments were processed successfully"
	}

	log.Printf("Upload response: Success=%t, Processed=%d, Errors=%d", response.Success, response.Processed, len(response.Errors))
	c.JSON(http.StatusOK, response)
}

// validatePayment validates a payment record
func validatePayment(payment models.PaymentRecord) error {
	// Check required fields
	if payment.CustomerName == "" {
		return fmt.Errorf("customer name is required")
	}
	if payment.PaymentDate.IsZero() {
		return fmt.Errorf("payment date is required")
	}
	if payment.Amount <= 0 {
		return fmt.Errorf("amount must be greater than 0")
	}
	if payment.Currency == "" {
		return fmt.Errorf("currency is required")
	}
	if payment.PaymentMethod == "" {
		return fmt.Errorf("payment method is required")
	}
	if payment.Project == "" {
		return fmt.Errorf("project is required")
	}
	if payment.AccountName == "" {
		return fmt.Errorf("account name is required")
	}

	// Validate currency
	validCurrencies := []string{models.CurrencyTL, models.CurrencyUSD, models.CurrencyEUR}
	if !contains(validCurrencies, payment.Currency) {
		return fmt.Errorf("invalid currency: %s", payment.Currency)
	}

	// Validate payment method
	validMethods := []string{models.PaymentMethodCash, models.PaymentMethodTransfer, models.PaymentMethodCheck}
	if !contains(validMethods, payment.PaymentMethod) {
		return fmt.Errorf("invalid payment method: %s", payment.PaymentMethod)
	}

	// Validate project
	validProjects := []string{models.ProjectMKM, models.ProjectMSM}
	if !contains(validProjects, payment.Project) {
		return fmt.Errorf("invalid project: %s", payment.Project)
	}

	return nil
}

// savePayment saves a payment record to the database (with duplicate checking)
func (h *UploadHandler) savePayment(payment models.PaymentRecord) error {
	// Check for duplicate payment first
	checkQuery := `
		SELECT COUNT(*) FROM payments 
		WHERE customer_name = ? AND payment_date = ? AND amount = ? AND currency = ? AND account_name = ?
	`
	
	var count int
	err := h.db.QueryRow(checkQuery,
		payment.CustomerName,
		payment.PaymentDate,
		payment.Amount,
		payment.Currency,
		payment.AccountName,
	).Scan(&count)
	
	if err != nil {
		return err
	}
	
	// If duplicate found, skip insertion
	if count > 0 {
		log.Printf("Duplicate payment detected for %s on %s, skipping", payment.CustomerName, payment.PaymentDate.Format("2006-01-02"))
		return nil
	}

	query := `
		INSERT INTO payments (
			customer_name, payment_date, amount, currency, payment_method,
			location, project, account_name, amount_usd, exchange_rate, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err = h.db.Exec(query,
		payment.CustomerName,
		payment.PaymentDate,
		payment.Amount,
		payment.Currency,
		payment.PaymentMethod,
		payment.Location,
		payment.Project,
		payment.AccountName,
		payment.AmountUSD,
		payment.ExchangeRate,
		payment.CreatedAt,
	)

	return err
}

// GetPayments retrieves all payments from the database
func (h *UploadHandler) GetPayments(c *gin.Context) {
	query := `SELECT * FROM payments ORDER BY payment_date DESC`
	rows, err := h.db.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var payments []models.PaymentRecord
	for rows.Next() {
		var payment models.PaymentRecord
		err := rows.Scan(
			&payment.ID,
			&payment.CustomerName,
			&payment.PaymentDate,
			&payment.Amount,
			&payment.Currency,
			&payment.PaymentMethod,
			&payment.Location,
			&payment.Project,
			&payment.AccountName,
			&payment.AmountUSD,
			&payment.ExchangeRate,
			&payment.CreatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		payments = append(payments, payment)
	}

	c.JSON(http.StatusOK, payments)
}

// GetReports generates and returns weekly reports
func (h *UploadHandler) GetReports(c *gin.Context) {
	// Get all payments
	query := `SELECT * FROM payments ORDER BY payment_date`
	rows, err := h.db.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var payments []models.PaymentRecord
	for rows.Next() {
		var payment models.PaymentRecord
		err := rows.Scan(
			&payment.ID,
			&payment.CustomerName,
			&payment.PaymentDate,
			&payment.Amount,
			&payment.Currency,
			&payment.PaymentMethod,
			&payment.Location,
			&payment.Project,
			&payment.AccountName,
			&payment.AmountUSD,
			&payment.ExchangeRate,
			&payment.CreatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		payments = append(payments, payment)
	}

	// Generate reports
	weeklyReports := services.GenerateWeeklyReports(payments)
	monthlyReports := services.GenerateMonthlyReports(payments)

	c.JSON(http.StatusOK, gin.H{
		"weekly_reports":  weeklyReports,
		"monthly_reports": monthlyReports,
	})
}

// ClearAllPayments removes all payment records from the database
func (h *UploadHandler) ClearAllPayments(c *gin.Context) {
	query := `DELETE FROM payments`
	result, err := h.db.Exec(query)
	if err != nil {
		log.Printf("Error clearing payments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	log.Printf("Cleared %d payment records", rowsAffected)
	
	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully cleared %d payment records", rowsAffected),
		"cleared": rowsAffected,
	})
}

// GetDatabaseStats returns statistics about the database
func (h *UploadHandler) GetDatabaseStats(c *gin.Context) {
	stats := make(map[string]interface{})

	// Total records
	var totalRecords int
	h.db.QueryRow("SELECT COUNT(*) FROM payments").Scan(&totalRecords)
	stats["total_records"] = totalRecords

	// Records by currency
	currencyQuery := `SELECT currency, COUNT(*) as count, SUM(amount) as total_amount FROM payments GROUP BY currency`
	rows, err := h.db.Query(currencyQuery)
	if err == nil {
		defer rows.Close()
		currencyStats := make(map[string]map[string]interface{})
		for rows.Next() {
			var currency string
			var count int
			var totalAmount float64
			rows.Scan(&currency, &count, &totalAmount)
			currencyStats[currency] = map[string]interface{}{
				"count":        count,
				"total_amount": totalAmount,
			}
		}
		stats["by_currency"] = currencyStats
	}

	// Records by project
	projectQuery := `SELECT project, COUNT(*) as count FROM payments GROUP BY project`
	rows, err = h.db.Query(projectQuery)
	if err == nil {
		defer rows.Close()
		projectStats := make(map[string]int)
		for rows.Next() {
			var project string
			var count int
			rows.Scan(&project, &count)
			projectStats[project] = count
		}
		stats["by_project"] = projectStats
	}

	// Date range
	var minDate, maxDate string
	h.db.QueryRow("SELECT MIN(payment_date), MAX(payment_date) FROM payments").Scan(&minDate, &maxDate)
	stats["date_range"] = map[string]string{
		"earliest": minDate,
		"latest":   maxDate,
	}

	c.JSON(http.StatusOK, stats)
}

// GetRawPaymentInfo returns detailed information about raw payment processing
func (h *UploadHandler) GetRawPaymentInfo(c *gin.Context) {
	var req models.UploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	log.Printf("Received raw payment info request with %d payments", len(req.RawPayments))

	// Analyze the raw data without processing
	info := make(map[string]interface{})
	info["total_raw_payments"] = len(req.RawPayments)
	
	if len(req.RawPayments) > 0 {
		// Sample first few records
		sampleSize := 3
		if len(req.RawPayments) < sampleSize {
			sampleSize = len(req.RawPayments)
		}
		info["sample_data"] = req.RawPayments[:sampleSize]
		
		// Check for required fields
		var missingFields []string
		sample := req.RawPayments[0]
		
		if sample.MusteriAdiSoyadi == "" {
			missingFields = append(missingFields, "musteri_adi_soyadi")
		}
		if sample.Tarih == "" {
			missingFields = append(missingFields, "tarih")
		}
		if sample.OdenenTutar == 0 {
			missingFields = append(missingFields, "odenen_tutar")
		}
		if sample.OdenenDoviz == "" {
			missingFields = append(missingFields, "odenen_doviz")
		}
		
		info["missing_fields"] = missingFields
		info["field_analysis"] = map[string]interface{}{
			"customer_names": len(req.RawPayments),
			"unique_currencies": getUniqueCurrencies(req.RawPayments),
			"date_range": getDateRange(req.RawPayments),
		}
	}

	c.JSON(http.StatusOK, info)
}

func getUniqueCurrencies(payments []models.RawPaymentData) []string {
	currencies := make(map[string]bool)
	for _, p := range payments {
		currencies[p.OdenenDoviz] = true
	}
	
	var result []string
	for currency := range currencies {
		result = append(result, currency)
	}
	return result
}

func getDateRange(payments []models.RawPaymentData) map[string]string {
	if len(payments) == 0 {
		return map[string]string{}
	}
	
	earliest := payments[0].Tarih
	latest := payments[0].Tarih
	
	for _, p := range payments {
		if p.Tarih < earliest {
			earliest = p.Tarih
		}
		if p.Tarih > latest {
			latest = p.Tarih
		}
	}
	
	return map[string]string{
		"earliest": earliest,
		"latest": latest,
	}
}

// contains checks if a slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if strings.EqualFold(s, item) {
			return true
		}
	}
	return false
}

// ParseDate parses date in DD/MM/YYYY format or Excel serial date
func ParseDate(dateStr string) (time.Time, error) {
	// Try DD/MM/YYYY format first (prioritize text dates)
	if t, err := time.Parse("02/01/2006", dateStr); err == nil {
		log.Printf("Parsed DD/MM/YYYY date %s -> %s", dateStr, t.Format("2006-01-02"))
		return t, nil
	}

	// Try DD-MM-YYYY format
	if t, err := time.Parse("02-01-2006", dateStr); err == nil {
		log.Printf("Parsed DD-MM-YYYY date %s -> %s", dateStr, t.Format("2006-01-02"))
		return t, nil
	}

	// Try YYYY-MM-DD format
	if t, err := time.Parse("2006-01-02", dateStr); err == nil {
		log.Printf("Parsed YYYY-MM-DD date %s -> %s", dateStr, t.Format("2006-01-02"))
		return t, nil
	}

	// Try to parse as Excel serial date (number)
	if floatVal, err := strconv.ParseFloat(dateStr, 64); err == nil && floatVal > 1 && floatVal < 100000 {
		// Excel serial date: days since January 1, 1900
		// Adjust for Excel's leap year bug (1900 is not a leap year)
		days := int(floatVal) - 1 // Excel starts from 1, not 0
		if floatVal > 59 {
			days = days - 1 // Adjust for Excel's 1900 leap year bug
		}
		
		// Convert to Go time
		excelEpoch := time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)
		date := excelEpoch.AddDate(0, 0, days)
		
		// Add fractional day (time portion)
		fractionalDay := floatVal - float64(int(floatVal))
		hours := fractionalDay * 24
		minutes := (hours - float64(int(hours))) * 60
		seconds := (minutes - float64(int(minutes))) * 60
		
		date = date.Add(time.Duration(int(hours)) * time.Hour)
		date = date.Add(time.Duration(int(minutes)) * time.Minute)
		date = date.Add(time.Duration(int(seconds)) * time.Second)
		
		log.Printf("Parsed Excel serial date %s (%.6f) -> %s", dateStr, floatVal, date.Format("2006-01-02"))
		return date, nil
	}

	return time.Time{}, fmt.Errorf("unable to parse date: %s", dateStr)
}

// ParseAmount parses amount string to float64
func ParseAmount(amountStr string) (float64, error) {
	// Remove any currency symbols and spaces
	amountStr = strings.TrimSpace(amountStr)
	amountStr = strings.ReplaceAll(amountStr, "₺", "")
	amountStr = strings.ReplaceAll(amountStr, "$", "")
	amountStr = strings.ReplaceAll(amountStr, "€", "")
	amountStr = strings.ReplaceAll(amountStr, ",", "")

	return strconv.ParseFloat(amountStr, 64)
}
