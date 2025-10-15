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
	for i, payment := range processedPayments {
		if err := h.savePayment(payment); err != nil {
			errors = append(errors, fmt.Sprintf("Database error for %s: %v", payment.CustomerName, err))
			continue
		}
		savedPayments = append(savedPayments, payment)
		log.Printf("Saved payment %d: %s - %s - %.2f %s", i+1, payment.CustomerName, payment.PaymentDate.Format("2006-01-02"), payment.Amount, payment.Currency)
	}

	// Generate reports
	weeklyReports := services.GenerateWeeklyReports(savedPayments)
	log.Printf("Generated %d weekly reports", len(weeklyReports))

	message := fmt.Sprintf("Processed %d payments successfully", len(savedPayments))

	response := models.UploadResponse{
		Success:       len(savedPayments) > 0,
		Message:       message,
		Processed:     len(savedPayments),
		Errors:        errors,
		WeeklyReports: weeklyReports,
	}

	if len(savedPayments) == 0 {
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

// savePayment saves a payment record to the database (allowing duplicates)
func (h *UploadHandler) savePayment(payment models.PaymentRecord) error {
	// Note: Removed duplicate checking to allow duplicate payments in reports
	query := `
		INSERT INTO payments (
			customer_name, payment_date, amount, currency, payment_method,
			location, project, account_name, amount_usd, exchange_rate, raw_data, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	// Create raw data JSON for audit purposes
	rawData := fmt.Sprintf(`{"original_date":"%s","processed_date":"%s","amount":%.2f,"currency":"%s"}`, 
		payment.PaymentDate, payment.PaymentDate, payment.Amount, payment.Currency)

	_, err := h.db.Exec(query,
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
		rawData,
		payment.CreatedAt,
	)

	return err
}

// GetPayments retrieves all payments from the database
func (h *UploadHandler) GetPayments(c *gin.Context) {
	query := `SELECT id, customer_name, payment_date, amount, currency, payment_method, location, project, account_name, amount_usd, exchange_rate, created_at, raw_data FROM payments ORDER BY payment_date DESC`
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
			&payment.RawData,
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
	query := `SELECT id, customer_name, payment_date, amount, currency, payment_method, location, project, account_name, amount_usd, exchange_rate, created_at, raw_data FROM payments ORDER BY payment_date`
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
			&payment.RawData,
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

// GetYearlyReport generates yearly report for a specific year
func (h *UploadHandler) GetYearlyReport(c *gin.Context) {
	yearStr := c.Param("year")
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid year parameter"})
		return
	}

	// Debug: First check if there are any payments at all
	var totalCount int
	countQuery := `SELECT COUNT(*) FROM payments`
	err = h.db.QueryRow(countQuery).Scan(&totalCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error counting payments: " + err.Error()})
		return
	}

	// Debug: Check payments for the year with different approaches
	var yearCount int
	yearCountQuery := `SELECT COUNT(*) FROM payments WHERE strftime('%Y', payment_date) = ?`
	err = h.db.QueryRow(yearCountQuery, yearStr).Scan(&yearCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error counting year payments: " + err.Error()})
		return
	}

	// Debug: Try alternative year filtering
	var altYearCount int
	altYearQuery := `SELECT COUNT(*) FROM payments WHERE payment_date >= ? AND payment_date < ?`
	startYear := fmt.Sprintf("%d-01-01", year)
	endYear := fmt.Sprintf("%d-01-01", year+1)
	err = h.db.QueryRow(altYearQuery, startYear, endYear).Scan(&altYearCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error counting alt year payments: " + err.Error()})
		return
	}

	// If no payments found, return debug info
	if yearCount == 0 && altYearCount == 0 {
		c.JSON(http.StatusOK, gin.H{
			"year": year,
			"debug": gin.H{
				"total_payments": totalCount,
				"year_payments_strftime": yearCount,
				"year_payments_range": altYearCount,
				"query_year": yearStr,
				"start_date": startYear,
				"end_date": endYear,
			},
			"project_summary": models.ProjectTotal{MKM: 0, MSM: 0},
			"location_summary": make(map[string]models.LocationTotal),
			"payment_methods": make(map[string]models.PaymentMethodTotal),
			"mkm_payment_methods": make(map[string]models.PaymentMethodTotal),
			"msm_payment_methods": make(map[string]models.PaymentMethodTotal),
		})
		return
	}

	// Use the alternative query if strftime doesn't work
	var query string
	var queryParams []interface{}
	if yearCount > 0 {
		query = `
		SELECT id, customer_name, amount, currency, payment_method, payment_date, 
		       account_name, project, location, amount_usd, exchange_rate, created_at, raw_data
		FROM payments 
		WHERE strftime('%Y', payment_date) = ?
		ORDER BY payment_date ASC`
		queryParams = []interface{}{yearStr}
	} else {
		query = `
		SELECT id, customer_name, amount, currency, payment_method, payment_date, 
		       account_name, project, location, amount_usd, exchange_rate, created_at, raw_data
		FROM payments 
		WHERE payment_date >= ? AND payment_date < ?
		ORDER BY payment_date ASC`
		queryParams = []interface{}{startYear, endYear}
	}

	rows, err := h.db.Query(query, queryParams...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var payments []models.Payment
	for rows.Next() {
		var payment models.Payment
		var rawData string
		err := rows.Scan(
			&payment.ID,
			&payment.CustomerName,
			&payment.Amount,
			&payment.Currency,
			&payment.PaymentMethod,
			&payment.PaymentDate,
			&payment.AccountName,
			&payment.Project,
			&payment.Location,
			&payment.AmountUSD,
			&payment.ExchangeRate,
			&payment.CreatedAt,
			&rawData,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		payments = append(payments, payment)
	}

	// Generate yearly report
	yearlyReport := services.GenerateYearlyReport(payments, year)

	c.JSON(http.StatusOK, yearlyReport)
}

// DeletePayment removes a specific payment record by ID
func (h *UploadHandler) DeletePayment(c *gin.Context) {
	paymentID := c.Param("id")
	
	if paymentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payment ID is required"})
		return
	}
	
	// First, get the payment details for audit purposes
	var payment models.PaymentRecord
	selectQuery := `SELECT id, customer_name, payment_date, amount, currency, payment_method, location, project, account_name, amount_usd, exchange_rate, created_at, raw_data FROM payments WHERE id = ?`
	err := h.db.QueryRow(selectQuery, paymentID).Scan(
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
		&payment.RawData,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
			return
		}
		log.Printf("Error retrieving payment for deletion: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	
	// Delete the payment
	deleteQuery := `DELETE FROM payments WHERE id = ?`
	result, err := h.db.Exec(deleteQuery, paymentID)
	if err != nil {
		log.Printf("Error deleting payment %s: %v", paymentID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}
	
	log.Printf("Deleted payment ID %s: %s - %s - %.2f %s", 
		paymentID, payment.CustomerName, payment.PaymentDate.Format("2006-01-02"), payment.Amount, payment.Currency)
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Payment deleted successfully",
		"deleted_payment": gin.H{
			"id": payment.ID,
			"customer_name": payment.CustomerName,
			"payment_date": payment.PaymentDate.Format("2006-01-02"),
			"amount": payment.Amount,
			"currency": payment.Currency,
			"payment_method": payment.PaymentMethod,
			"project": payment.Project,
		},
	})
}

// ClearAllPayments removes all payment records with comprehensive audit and verification
func (h *UploadHandler) ClearAllPayments(c *gin.Context) {
	log.Printf("=== COMPREHENSIVE DATABASE CLEAR AUDIT ===")
	
	// Step 1: Pre-deletion audit
	audit := h.auditDataBeforeDeletion()
	
	// Step 2: Delete all payments
	query := `DELETE FROM payments`
	result, err := h.db.Exec(query)
	if err != nil {
		log.Printf("Error clearing payments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	log.Printf("Cleared %d payment records", rowsAffected)
	
	// Step 3: Post-deletion verification
	verification := h.verifyDatabaseClear()
	
	log.Printf("=== DATABASE CLEAR COMPLETE ===")
	
	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully cleared %d payment records", rowsAffected),
		"cleared": rowsAffected,
		"pre_deletion_audit": audit,
		"post_deletion_verification": verification,
	})
}

// DeletePaymentsByDateRange removes payment records within a specific date range
func (h *UploadHandler) DeletePaymentsByDateRange(c *gin.Context) {
	// Get date parameters from query string
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	
	if startDate == "" || endDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Both start_date and end_date parameters are required (format: YYYY-MM-DD)",
		})
		return
	}
	
	// Validate date format
	_, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid start_date format. Use YYYY-MM-DD",
		})
		return
	}
	
	_, err = time.Parse("2006-01-02", endDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid end_date format. Use YYYY-MM-DD",
		})
		return
	}
	
	log.Printf("=== DATE RANGE DELETION AUDIT ===")
	log.Printf("Deleting payments from %s to %s", startDate, endDate)
	
	// Step 1: Count records to be deleted
	countQuery := `SELECT COUNT(*) FROM payments WHERE payment_date LIKE ? || '%' AND payment_date LIKE ? || '%'`
	var recordsToDelete int
	err = h.db.QueryRow(countQuery, startDate, endDate).Scan(&recordsToDelete)
	if err != nil {
		log.Printf("Error counting records to delete: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	// If start and end dates are the same, use a single date filter
	if startDate == endDate {
		countQuery = `SELECT COUNT(*) FROM payments WHERE payment_date LIKE ? || '%'`
		err = h.db.QueryRow(countQuery, startDate).Scan(&recordsToDelete)
		if err != nil {
			log.Printf("Error counting records to delete: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	} else {
		// For date range, we need a more complex query
		countQuery = `SELECT COUNT(*) FROM payments WHERE substr(payment_date, 1, 10) >= ? AND substr(payment_date, 1, 10) <= ?`
		err = h.db.QueryRow(countQuery, startDate, endDate).Scan(&recordsToDelete)
		if err != nil {
			log.Printf("Error counting records to delete: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	
	if recordsToDelete == 0 {
		c.JSON(http.StatusOK, gin.H{
			"message": "No payments found in the specified date range",
			"deleted": 0,
			"date_range": gin.H{
				"start_date": startDate,
				"end_date": endDate,
			},
		})
		return
	}
	
	// Step 2: Get details of records to be deleted for audit
	var auditQuery string
	var auditRows *sql.Rows
	
	if startDate == endDate {
		auditQuery = `SELECT customer_name, payment_method, amount, currency, payment_date, project 
		               FROM payments WHERE payment_date LIKE ? || '%'`
		auditRows, err = h.db.Query(auditQuery, startDate)
	} else {
		auditQuery = `SELECT customer_name, payment_method, amount, currency, payment_date, project 
		               FROM payments WHERE substr(payment_date, 1, 10) >= ? AND substr(payment_date, 1, 10) <= ?`
		auditRows, err = h.db.Query(auditQuery, startDate, endDate)
	}
	
	if err != nil {
		log.Printf("Error getting records for audit: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer auditRows.Close()
	
	var auditRecords []map[string]interface{}
	for auditRows.Next() {
		var customerName, paymentMethod, currency, paymentDate, project string
		var amount float64
		auditRows.Scan(&customerName, &paymentMethod, &amount, &currency, &paymentDate, &project)
		auditRecords = append(auditRecords, map[string]interface{}{
			"customer_name": customerName,
			"payment_method": paymentMethod,
			"amount": amount,
			"currency": currency,
			"payment_date": paymentDate,
			"project": project,
		})
	}
	
	// Step 3: Delete records
	var deleteQuery string
	var result sql.Result
	
	if startDate == endDate {
		deleteQuery = `DELETE FROM payments WHERE payment_date LIKE ? || '%'`
		result, err = h.db.Exec(deleteQuery, startDate)
	} else {
		deleteQuery = `DELETE FROM payments WHERE substr(payment_date, 1, 10) >= ? AND substr(payment_date, 1, 10) <= ?`
		result, err = h.db.Exec(deleteQuery, startDate, endDate)
	}
	if err != nil {
		log.Printf("Error deleting payments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	log.Printf("Deleted %d payment records from %s to %s", rowsAffected, startDate, endDate)
	log.Printf("=== DATE RANGE DELETION COMPLETE ===")
	
	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully deleted %d payment records from %s to %s", rowsAffected, startDate, endDate),
		"deleted": rowsAffected,
		"date_range": gin.H{
			"start_date": startDate,
			"end_date": endDate,
		},
		"deleted_records": auditRecords,
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

// auditDataBeforeDeletion performs comprehensive audit before deletion
func (h *UploadHandler) auditDataBeforeDeletion() map[string]interface{} {
	audit := make(map[string]interface{})
	
	// Total record count
	var totalRecords int
	h.db.QueryRow("SELECT COUNT(*) FROM payments").Scan(&totalRecords)
	audit["total_records"] = totalRecords
	log.Printf("AUDIT: Total records before deletion: %d", totalRecords)
	
	// Check for December 2025 phantom data
	var dec2025Count int
	h.db.QueryRow("SELECT COUNT(*) FROM payments WHERE payment_date LIKE '%-12-2025%' OR payment_date LIKE '%2025-12-%'").Scan(&dec2025Count)
	audit["december_2025_records"] = dec2025Count
	if dec2025Count > 0 {
		log.Printf("⚠️  AUDIT ALERT: Found %d December 2025 phantom records!", dec2025Count)
		
		// Get sample of phantom records
		rows, err := h.db.Query("SELECT payment_date, amount, currency FROM payments WHERE payment_date LIKE '%-12-2025%' OR payment_date LIKE '%2025-12-%' LIMIT 5")
		if err == nil {
			defer rows.Close()
			var samples []map[string]interface{}
			for rows.Next() {
				var date string
				var amount float64
				var currency string
				rows.Scan(&date, &amount, &currency)
				samples = append(samples, map[string]interface{}{
					"date": date, "amount": amount, "currency": currency,
				})
				log.Printf("PHANTOM SAMPLE: %s, %.2f %s", date, amount, currency)
			}
			audit["december_2025_samples"] = samples
		}
	}
	
	// Check for future dates (beyond 6 months)
	var futureCount int
	h.db.QueryRow("SELECT COUNT(*) FROM payments WHERE payment_date > date('now', '+6 months')").Scan(&futureCount)
	audit["future_date_records"] = futureCount
	if futureCount > 0 {
		log.Printf("⚠️  AUDIT: Found %d records with future dates!", futureCount)
	}
	
	// Date range analysis
	var minDate, maxDate string
	h.db.QueryRow("SELECT MIN(payment_date), MAX(payment_date) FROM payments").Scan(&minDate, &maxDate)
	audit["date_range"] = map[string]string{"min": minDate, "max": maxDate}
	log.Printf("AUDIT: Date range: %s to %s", minDate, maxDate)
	
	// Month distribution
	monthQuery := `SELECT strftime('%Y-%m', payment_date) as month, COUNT(*) as count FROM payments GROUP BY month ORDER BY month`
	rows, err := h.db.Query(monthQuery)
	if err == nil {
		defer rows.Close()
		monthDist := make(map[string]int)
		for rows.Next() {
			var month string
			var count int
			rows.Scan(&month, &count)
			monthDist[month] = count
			log.Printf("AUDIT: %s: %d records", month, count)
		}
		audit["month_distribution"] = monthDist
	}
	
	return audit
}

// verifyDatabaseClear verifies the database is completely clear
func (h *UploadHandler) verifyDatabaseClear() map[string]interface{} {
	verification := make(map[string]interface{})
	
	// Check total count
	var totalRecords int
	h.db.QueryRow("SELECT COUNT(*) FROM payments").Scan(&totalRecords)
	verification["remaining_records"] = totalRecords
	
	isClean := totalRecords == 0
	verification["is_clean"] = isClean
	
	if isClean {
		log.Printf("✅ VERIFICATION PASSED: Database is completely clean")
	} else {
		log.Printf("❌ VERIFICATION FAILED: %d records remain in database!", totalRecords)
		
		// Get sample of remaining records
		rows, err := h.db.Query("SELECT payment_date, amount, currency FROM payments LIMIT 5")
		if err == nil {
			defer rows.Close()
			var samples []map[string]interface{}
			for rows.Next() {
				var date string
				var amount float64
				var currency string
				rows.Scan(&date, &amount, &currency)
				samples = append(samples, map[string]interface{}{
					"date": date, "amount": amount, "currency": currency,
				})
				log.Printf("REMAINING RECORD: %s, %.2f %s", date, amount, currency)
			}
			verification["remaining_samples"] = samples
		}
	}
	
	return verification
}

// AuditReportGeneration audits report generation for data integrity
func (h *UploadHandler) AuditReportGeneration(c *gin.Context) {
	log.Printf("=== REPORT GENERATION AUDIT ===")
	
	// Get request parameters
	year := c.Query("year")
	month := c.Query("month")
	week := c.Query("week")
	
	audit := make(map[string]interface{})
	audit["request_params"] = map[string]string{
		"year": year, "month": month, "week": week,
	}
	
	// Audit data used for report
	var recordCount int
	var query string
	var args []interface{}
	
	if month != "" && year != "" {
		// Monthly report audit
		query = "SELECT COUNT(*) FROM payments WHERE strftime('%Y', payment_date) = ? AND strftime('%m', payment_date) = ?"
		args = []interface{}{year, month}
		audit["report_type"] = "monthly"
	} else if week != "" && year != "" {
		// Weekly report audit  
		query = "SELECT COUNT(*) FROM payments WHERE strftime('%Y', payment_date) = ? AND strftime('%W', payment_date) = ?"
		args = []interface{}{year, week}
		audit["report_type"] = "weekly"
	} else {
		audit["report_type"] = "invalid"
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report parameters", "audit": audit})
		return
	}
	
	h.db.QueryRow(query, args...).Scan(&recordCount)
	audit["matching_records"] = recordCount
	
	log.Printf("AUDIT: %s report for %s/%s uses %d records", audit["report_type"], year, month, recordCount)
	
	// Check for phantom December 2025 data in results
	if month == "12" && year == "2025" {
		log.Printf("🚨 CRITICAL AUDIT ALERT: Request for December 2025 report detected!")
		audit["phantom_alert"] = "December 2025 report requested - investigating data source"
		
		// Deep audit of December 2025 data
		phantomQuery := "SELECT payment_date, amount, currency, raw_data FROM payments WHERE strftime('%Y', payment_date) = '2025' AND strftime('%m', payment_date) = '12'"
		rows, err := h.db.Query(phantomQuery)
		if err == nil {
			defer rows.Close()
			var phantomRecords []map[string]interface{}
			for rows.Next() {
				var date, currency, rawData string
				var amount float64
				rows.Scan(&date, &amount, &currency, &rawData)
				phantomRecords = append(phantomRecords, map[string]interface{}{
					"date": date, "amount": amount, "currency": currency, "raw_data": rawData,
				})
				log.Printf("PHANTOM RECORD FOUND: %s, %.2f %s, raw: %s", date, amount, currency, rawData)
			}
			audit["phantom_records"] = phantomRecords
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"audit": audit,
		"message": "Report generation audit completed",
	})
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
