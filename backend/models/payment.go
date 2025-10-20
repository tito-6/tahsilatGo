package models

import (
	"time"
)

// RawPaymentData represents the raw data from Excel import
type RawPaymentData struct {
	MusteriAdiSoyadi string  `json:"musteri_adi_soyadi"` // "Müşteri Adı Soyadı"
	Tarih            string  `json:"tarih"`              // "Tarih" - DD/MM/YYYY format
	TahsilatSekli    string  `json:"tahsilat_sekli"`     // "Tahsilat Şekli"
	HesapAdi         string  `json:"hesap_adi"`          // "Hesap Adı"
	OdenenTutar      float64 `json:"odenen_tutar"`       // "Ödenen Tutar(Σ:...)"
	OdenenDoviz      string  `json:"odenen_doviz"`       // "Ödenen Döviz"
	ProjeAdi         string  `json:"proje_adi"`          // "Proje Adı"
}

// PaymentRecord represents a processed payment record
type PaymentRecord struct {
	ID            int       `json:"id" db:"id"`
	CustomerName  string    `json:"customer_name" db:"customer_name"`
	PaymentDate   time.Time `json:"payment_date" db:"payment_date"`
	Amount        float64   `json:"amount" db:"amount"`
	Currency      string    `json:"currency" db:"currency"`             // TL, USD, EUR
	PaymentMethod string    `json:"payment_method" db:"payment_method"` // Nakit, Banka Havalesi, Çek
	Location      string    `json:"location" db:"location"`             // ÇARŞI, KUYUMCUKENT, OFİS, BANKA HAVALESİ
	Project       string    `json:"project" db:"project"`               // MKM, MSM
	AccountName   string    `json:"account_name" db:"account_name"`
	AmountUSD     float64   `json:"amount_usd" db:"amount_usd"`       // Calculated
	ExchangeRate  float64   `json:"exchange_rate" db:"exchange_rate"` // Used rate
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	RawData       string    `json:"raw_data" db:"raw_data"`           // Original raw data for audit
	// KDV (Tax) related fields
	IncludesKdv *bool    `json:"includes_kdv" db:"includes_kdv"`     // Whether payment includes KDV
	KdvAmount   *float64 `json:"kdv_amount" db:"kdv_amount"`         // KDV amount
	KdvRate     *float64 `json:"kdv_rate" db:"kdv_rate"`             // KDV rate percentage
	KdvNote     *string  `json:"kdv_note" db:"kdv_note"`             // KDV related note
}

// WeeklyReport represents a weekly report structure
type WeeklyReport struct {
	StartDate       time.Time                     `json:"start_date"`
	EndDate         time.Time                     `json:"end_date"`
	WeekNumber      string                        `json:"week_number"`
	CustomerSummary map[string]float64            `json:"customer_summary"`
	PaymentMethods  map[string]PaymentMethodTotal `json:"payment_methods"`
	ProjectSummary  ProjectTotal                  `json:"project_summary"`
	LocationSummary map[string]LocationTotal      `json:"location_summary"`
	Payments        []PaymentRecord               `json:"payments"`
}

// PaymentMethodTotal represents totals by payment method
type PaymentMethodTotal struct {
	TL       float64 `json:"tl"`
	USD      float64 `json:"usd"`
	TotalUSD float64 `json:"total_usd"` // Grand total in USD (TL converted + USD)
}

// ProjectTotal represents project-based totals
type ProjectTotal struct {
	MKM float64 `json:"mkm"`
	MSM float64 `json:"msm"`
}

// LocationTotal represents totals by location
type LocationTotal struct {
	MKM   float64 `json:"mkm"`
	MSM   float64 `json:"msm"`
	Total float64 `json:"total"`
}

// MonthlyReport represents monthly aggregated data
type MonthlyReport struct {
	Month           time.Time                `json:"month"`
	ProjectSummary  ProjectTotal             `json:"project_summary"`
	LocationSummary map[string]LocationTotal `json:"location_summary"`
	DailyTotals     map[string]float64       `json:"daily_totals"` // date string -> USD amount
	PaymentMethods  map[string]PaymentMethodTotal `json:"payment_methods"` // payment method breakdown
	MKMPaymentMethods map[string]PaymentMethodTotal `json:"mkm_payment_methods"` // MKM project payment methods
	MSMPaymentMethods map[string]PaymentMethodTotal `json:"msm_payment_methods"` // MSM project payment methods
}

// YearlyReport represents yearly aggregated payment data
type YearlyReport struct {
	Year              int                          `json:"year"`
	ProjectSummary    ProjectTotal                 `json:"project_summary"`
	LocationSummary   map[string]LocationTotal     `json:"location_summary"`
	PaymentMethods    map[string]PaymentMethodTotal `json:"payment_methods"` // payment method breakdown
	MKMPaymentMethods map[string]PaymentMethodTotal `json:"mkm_payment_methods"` // MKM project payment methods
	MSMPaymentMethods map[string]PaymentMethodTotal `json:"msm_payment_methods"` // MSM project payment methods
	MonthlyReports    []MonthlyReport              `json:"monthly_reports"` // monthly breakdown
}

// UploadRequest represents the request structure for file upload
type UploadRequest struct {
	RawPayments []RawPaymentData `json:"raw_payments"`
}

// UploadResponse represents the response after processing upload
type UploadResponse struct {
	Success       bool           `json:"success"`
	Message       string         `json:"message"`
	Processed     int            `json:"processed"`
	Errors        []string       `json:"errors,omitempty"`
	WeeklyReports []WeeklyReport `json:"weekly_reports,omitempty"`
}

// ExportRequest represents request for report export
type ExportRequest struct {
	Format string `json:"format"` // "excel" or "pdf"
	Type   string `json:"type"`   // "weekly" or "monthly"
}

// KdvUpdateRequest represents request to update KDV information
type KdvUpdateRequest struct {
	IncludesKdv bool     `json:"includes_kdv"`
	KdvAmount   *float64 `json:"kdv_amount,omitempty"`
	KdvRate     *float64 `json:"kdv_rate,omitempty"`
	KdvNote     *string  `json:"kdv_note,omitempty"`
}

// KdvUpdateResponse represents response after updating KDV
type KdvUpdateResponse struct {
	Message string        `json:"message"`
	Payment PaymentRecord `json:"payment"`
}

// ExchangeRate represents TCMB exchange rate data
type ExchangeRate struct {
	Date         time.Time `json:"date"`
	Currency     string    `json:"currency"`
	ForexSelling float64   `json:"forex_selling"`
}

// Valid currencies
const (
	CurrencyTL  = "TL"
	CurrencyUSD = "USD"
	CurrencyEUR = "EUR"
)

// Valid payment methods
const (
	PaymentMethodCash     = "Nakit"
	PaymentMethodTransfer = "Banka Havalesi"
	PaymentMethodCheck    = "Çek"
)

// Valid projects
const (
	ProjectMKM = "MKM"
	ProjectMSM = "MSM"
)

// Valid locations
const (
	LocationCarşı       = "CARŞI"
	LocationKuyumcukent = "KUYUMCUKENT"
	LocationOfis        = "OFİS"
	LocationBanka       = "BANKA HAVALESİ"
	LocationCek         = "ÇEK"
)

// Payment represents a payment record for backend yearly report handler compatibility
type Payment struct {
	ID            int       `json:"id" db:"id"`
	CustomerName  string    `json:"customer_name" db:"customer_name"`
	Amount        float64   `json:"amount" db:"amount"`
	Currency      string    `json:"currency" db:"currency"`
	PaymentMethod string    `json:"payment_method" db:"payment_method"`
	PaymentDate   time.Time `json:"payment_date" db:"payment_date"`
	AccountName   string    `json:"account_name" db:"account_name"`
	Project       string    `json:"project" db:"project"`
	Location      string    `json:"location" db:"location"`
	AmountUSD     float64   `json:"amount_usd" db:"amount_usd"`
	ExchangeRate  float64   `json:"exchange_rate" db:"exchange_rate"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	// KDV (Tax) related fields
	IncludesKdv *bool    `json:"includes_kdv" db:"includes_kdv"`
	KdvAmount   *float64 `json:"kdv_amount" db:"kdv_amount"`
	KdvRate     *float64 `json:"kdv_rate" db:"kdv_rate"`
	KdvNote     *string  `json:"kdv_note" db:"kdv_note"`
}
