package services

import (
	"strings"
)

// PaymentMethodClassifier classifies payment methods based on raw data
type PaymentMethodClassifier struct{}

// Classify determines payment method ONLY from tahsilat sekli column
func (p *PaymentMethodClassifier) Classify(tahsilatSekli string, hesapAdi string) string {
	// Payment method should ONLY be determined by Tahsilat Şekli column
	// Hesap Adı should NOT affect payment method classification
	
	tahsilatLower := strings.ToLower(strings.TrimSpace(tahsilatSekli))

	// Check for Çek (Check)
	if strings.Contains(tahsilatLower, "çek") {
		return "Çek"
	}

	// Check for Bank Transfer/Wire Transfer
	if strings.Contains(tahsilatLower, "banka havalesi") ||
		strings.Contains(tahsilatLower, "havale") {
		return "Banka Havalesi"
	}

	// Check for Cash payments
	if strings.Contains(tahsilatLower, "nakit") ||
		strings.Contains(tahsilatLower, "kasa") {
		return "Nakit"
	}

	// Handle common payment terms
	if strings.Contains(tahsilatLower, "vadeli") {
		// Vadeli payments are typically bank transfers in this context
		return "Banka Havalesi"
	}

	// Default fallback for unknown payment types
	return "Nakit"
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
