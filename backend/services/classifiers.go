package services

import (
	"strings"
)

// PaymentMethodClassifier classifies payment methods based on raw data
type PaymentMethodClassifier struct{}

// Classify determines payment method from tahsilat sekli and hesap adi
func (p *PaymentMethodClassifier) Classify(tahsilatSekli string, hesapAdi string) string {
	// Handle multiple payment types in one field
	// Example: "Vadeli Ödeme, Vadeli Ödeme, Vadeli Ödeme"

	tahsilatLower := strings.ToLower(tahsilatSekli)
	hesapLower := strings.ToLower(hesapAdi)

	// Check for Çek (Check)
	if strings.Contains(tahsilatLower, "çek") {
		return "Çek"
	}

	// Check for Bank Transfer
	if strings.Contains(hesapLower, "yapi kredi") ||
		strings.Contains(hesapLower, "banka") ||
		strings.Contains(tahsilatLower, "havale") {
		return "Banka Havalesi"
	}

	// Check for Cash (Kasa means cash box/register)
	if strings.Contains(hesapLower, "kasa") {
		return "Nakit"
	}

	// Default based on common patterns
	if strings.Contains(tahsilatLower, "vadeli") ||
		strings.Contains(tahsilatLower, "kdv") {
		// Check account type for final classification
		if strings.Contains(hesapLower, "kasa") {
			return "Nakit"
		}
		return "Banka Havalesi"
	}

	return "Nakit" // Default fallback
}

// LocationClassifier classifies locations based on account name
type LocationClassifier struct{}

// Classify determines location from hesap adi
func (l *LocationClassifier) Classify(hesapAdi string) string {
	hesapLower := strings.ToLower(hesapAdi)

	// ÇARŞI - Shopping area accounts
	if strings.Contains(hesapLower, "çarşi") ||
		strings.Contains(hesapLower, "carsi") {
		return "ÇARŞI"
	}

	// KUYUMCUKENT - Jewelry district
	if strings.Contains(hesapLower, "kuyumcukent") {
		return "KUYUMCUKENT"
	}

	// OFİS - Office
	if strings.Contains(hesapLower, "ofis") ||
		strings.Contains(hesapLower, "office") {
		return "OFİS"
	}

	// BANKA - Bank transfers (if not categorized above)
	if strings.Contains(hesapLower, "yapi kredi") ||
		strings.Contains(hesapLower, "banka") {
		return "BANKA HAVALESİ"
	}

	return "DİĞER"
}

// ProjectClassifier classifies projects based on project name
type ProjectClassifier struct{}

// Classify determines project from proje adi
func (p *ProjectClassifier) Classify(projeAdi string) string {
	projeAdi = strings.TrimSpace(strings.ToUpper(projeAdi))

	// Model Kuyum Merkezi (MKM)
	if strings.Contains(projeAdi, "MODEL KUYUM") ||
		strings.Contains(projeAdi, "KUYUM MERKEZİ") ||
		strings.Contains(projeAdi, "MKM") {
		return "MKM"
	}

	// Model Sanayi Merkezi (MSM)
	if strings.Contains(projeAdi, "MODEL SANAYI") ||
		strings.Contains(projeAdi, "SANAYI MERKEZİ") ||
		strings.Contains(projeAdi, "MSM") ||
		strings.Contains(projeAdi, "3. ETAP") {
		return "MSM"
	}

	return "UNKNOWN"
}

// ProcessedPayment represents a fully processed payment record
type ProcessedPayment struct {
	CustomerName  string
	PaymentDate   string
	Amount        float64
	Currency      string
	PaymentMethod string // Nakit, Banka Havalesi, Çek
	Location      string // ÇARŞI, KUYUMCUKENT, OFİS, BANKA HAVALESİ
	Project       string // MKM, MSM
	AccountName   string
	AmountUSD     float64
	ExchangeRate  float64
	OriginalData  interface{} // Keep reference to original data for debugging
}
