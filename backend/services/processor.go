package services

import (
	"fmt"
	"log"
	"strconv"
	"strings"
	"tahsilat-raporu/models"
	"time"
)

// PaymentProcessor handles the complete payment processing pipeline
type PaymentProcessor struct {
	methodClassifier   *PaymentMethodClassifier
	locationClassifier *LocationClassifier
	projectClassifier  *ProjectClassifier
}

// NewPaymentProcessor creates a new payment processor
func NewPaymentProcessor() *PaymentProcessor {
	return &PaymentProcessor{
		methodClassifier:   &PaymentMethodClassifier{},
		locationClassifier: &LocationClassifier{},
		projectClassifier:  &ProjectClassifier{},
	}
}

// Process converts raw payment data to processed payment record
func (p *PaymentProcessor) Process(raw models.RawPaymentData) (*models.PaymentRecord, error) {
	// Parse date - now supports Excel serial dates
	paymentDate, err := parseImprovedDate(raw.Tarih)
	if err != nil {
		return nil, fmt.Errorf("invalid date format '%s': %v", raw.Tarih, err)
	}

	// Classify payment components
	paymentMethod := p.methodClassifier.Classify(raw.TahsilatSekli, raw.HesapAdi)
	location := p.locationClassifier.Classify(raw.HesapAdi)
	project := p.projectClassifier.Classify(raw.ProjeAdi)

	// Create processed payment
	payment := &models.PaymentRecord{
		CustomerName:  strings.TrimSpace(raw.MusteriAdiSoyadi),
		PaymentDate:   paymentDate,
		Amount:        raw.OdenenTutar,
		Currency:      strings.ToUpper(strings.TrimSpace(raw.OdenenDoviz)),
		PaymentMethod: paymentMethod,
		Location:      location,
		Project:       project,
		AccountName:   strings.TrimSpace(raw.HesapAdi),
		CreatedAt:     time.Now(),
	}

	// Convert to USD
	amountUSD, rate, err := p.convertToUSD(payment)
	if err != nil {
		return nil, fmt.Errorf("currency conversion failed: %v", err)
	}

	payment.AmountUSD = amountUSD
	payment.ExchangeRate = rate

	return payment, nil
}

// convertToUSD converts any currency amount to USD
func (p *PaymentProcessor) convertToUSD(payment *models.PaymentRecord) (float64, float64, error) {
	log.Printf("Converting to USD: %.2f %s on %s", payment.Amount, payment.Currency, payment.PaymentDate.Format("2006-01-02"))
	
	if payment.Currency == "USD" {
		log.Printf("Already in USD: %.2f", payment.Amount)
		return payment.Amount, 1.0, nil
	}

	if payment.Currency == "TL" {
		rate, err := GetExchangeRate(payment.PaymentDate, "USD")
		if err != nil {
			log.Printf("Error getting USD rate: %v", err)
			return 0, 0, err
		}
		usdAmount := payment.Amount / rate
		log.Printf("TL to USD: %.2f TL * (1/%.4f) = %.2f USD", payment.Amount, rate, usdAmount)
		return usdAmount, rate, nil
	}

	if payment.Currency == "EUR" {
		usdRate, err := GetExchangeRate(payment.PaymentDate, "USD")
		if err != nil {
			log.Printf("Error getting USD rate: %v", err)
			return 0, 0, err
		}
		eurRate, err := GetExchangeRate(payment.PaymentDate, "EUR")
		if err != nil {
			log.Printf("Error getting EUR rate: %v", err)
			return 0, 0, err
		}
		// EUR amount -> TL -> USD
		tlAmount := payment.Amount * eurRate
		usdAmount := tlAmount / usdRate
		log.Printf("EUR to USD: %.2f EUR * %.4f / %.4f = %.2f USD", payment.Amount, eurRate, usdRate, usdAmount)
		return usdAmount, eurRate, nil
	}

	return 0, 0, fmt.Errorf("unsupported currency: %s", payment.Currency)
}

// ValidatePayment validates a processed payment record
func ValidatePayment(payment *models.PaymentRecord) []string {
	var errors []string

	// Customer name required
	if payment.CustomerName == "" {
		errors = append(errors, "Müşteri adı boş olamaz")
	}

	// Amount must be positive
	if payment.Amount <= 0 {
		errors = append(errors, "Ödenen tutar sıfırdan büyük olmalı")
	}

	// Currency must be valid
	validCurrencies := map[string]bool{"TL": true, "USD": true, "EUR": true}
	if !validCurrencies[payment.Currency] {
		errors = append(errors, "Geçersiz para birimi: "+payment.Currency)
	}

	// Project must be recognized
	if payment.Project == "UNKNOWN" {
		errors = append(errors, "Proje tanımlanamadı")
	}

	// Date must be reasonable
	if payment.PaymentDate.After(time.Now().AddDate(0, 0, 1)) {
		errors = append(errors, "Gelecek tarihli ödeme")
	}

	// Date must not be too old (more than 10 years)
	if payment.PaymentDate.Before(time.Now().AddDate(-10, 0, 0)) {
		errors = append(errors, "Çok eski tarihli ödeme")
	}

	return errors
}

// ProcessBatch processes multiple raw payments
func (p *PaymentProcessor) ProcessBatch(rawPayments []models.RawPaymentData) ([]models.PaymentRecord, []string) {
	var processedPayments []models.PaymentRecord
	var allErrors []string

	log.Printf("=== STARTING BATCH PROCESSING ===")
	log.Printf("Total raw payments to process: %d", len(rawPayments))

	for i, raw := range rawPayments {
		log.Printf("--- Processing row %d ---", i+1)
		log.Printf("Customer: %s, Date: %s, Amount: %.2f %s", raw.MusteriAdiSoyadi, raw.Tarih, raw.OdenenTutar, raw.OdenenDoviz)
		
		payment, err := p.Process(raw)
		if err != nil {
			errorMsg := fmt.Sprintf("Satır %d (%s): %v", i+1, raw.MusteriAdiSoyadi, err)
			allErrors = append(allErrors, errorMsg)
			log.Printf("ERROR processing row %d: %v", i+1, err)
			continue
		}

		// Validate the processed payment
		validationErrors := ValidatePayment(payment)
		if len(validationErrors) > 0 {
			for _, validationError := range validationErrors {
				errorMsg := fmt.Sprintf("Satır %d (%s): %s", i+1, raw.MusteriAdiSoyadi, validationError)
				allErrors = append(allErrors, errorMsg)
				log.Printf("VALIDATION ERROR row %d: %s", i+1, validationError)
			}
			continue
		}

		processedPayments = append(processedPayments, *payment)
		log.Printf("SUCCESS row %d: %s - %.2f USD", i+1, payment.CustomerName, payment.AmountUSD)
	}

	log.Printf("=== BATCH PROCESSING COMPLETE ===")
	log.Printf("Successfully processed: %d/%d payments", len(processedPayments), len(rawPayments))
	log.Printf("Errors encountered: %d", len(allErrors))
	
	for _, err := range allErrors {
		log.Printf("ERROR: %s", err)
	}

	return processedPayments, allErrors
}

// parseImprovedDate parses date in multiple formats including Excel serial dates
func parseImprovedDate(dateStr string) (time.Time, error) {
	// First, try to parse as Excel serial date (number)
	if floatVal, err := strconv.ParseFloat(dateStr, 64); err == nil {
		// Excel serial date: days since January 1, 1900
		// Adjust for Excel's leap year bug (1900 is not a leap year)
		if floatVal > 59 {
			floatVal = floatVal - 1
		}
		
		// Convert to Go time
		excelEpoch := time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)
		days := int(floatVal) - 1 // Excel starts from 1, not 0
		fractionalDay := floatVal - float64(int(floatVal))
		
		date := excelEpoch.AddDate(0, 0, days)
		
		// Add fractional day (time portion)
		hours := fractionalDay * 24
		minutes := (hours - float64(int(hours))) * 60
		seconds := (minutes - float64(int(minutes))) * 60
		
		date = date.Add(time.Duration(int(hours)) * time.Hour)
		date = date.Add(time.Duration(int(minutes)) * time.Minute)
		date = date.Add(time.Duration(int(seconds)) * time.Second)
		
		log.Printf("Parsed Excel serial date %s -> %s", dateStr, date.Format("2006-01-02"))
		return date, nil
	}
	
	// Try DD/MM/YYYY format
	if t, err := time.Parse("02/01/2006", dateStr); err == nil {
		return t, nil
	}

	// Try DD-MM-YYYY format
	if t, err := time.Parse("02-01-2006", dateStr); err == nil {
		return t, nil
	}

	// Try YYYY-MM-DD format
	if t, err := time.Parse("2006-01-02", dateStr); err == nil {
		return t, nil
	}

	return time.Time{}, fmt.Errorf("invalid date format: %s", dateStr)
}
