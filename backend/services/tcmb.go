package services

import (
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// Currency represents a single currency from TCMB XML
type Currency struct {
	CurrencyCode string  `xml:"CurrencyCode,attr"`
	ForexSelling float64 `xml:"ForexSelling"`
}

// TarihDate represents the XML structure from TCMB
type TarihDate struct {
	Currency []Currency `xml:"Currency"`
}

var (
	rateCache = make(map[string]float64)
	cacheMux  sync.RWMutex
)

// GetExchangeRate fetches exchange rate from TCMB for a given date and currency
func GetExchangeRate(paymentDate time.Time, currency string) (float64, error) {
	// TL doesn't need conversion
	if currency == "TL" {
		return 1.0, nil
	}

	cacheKey := fmt.Sprintf("%s_%s", paymentDate.Format("2006-01-02"), currency)

	// Check cache first
	cacheMux.RLock()
	if rate, exists := rateCache[cacheKey]; exists {
		cacheMux.RUnlock()
		return rate, nil
	}
	cacheMux.RUnlock()

	// Get previous business day
	prevDay := getPreviousBusinessDay(paymentDate)

	// Try to fetch rate from TCMB
	rate, err := fetchTCMBRate(prevDay, currency)
	if err != nil {
		// If failed, try going back more days
		rate, err = tryPreviousDays(prevDay, currency, 7)
		if err != nil {
			return 0, fmt.Errorf("could not fetch exchange rate for %s on %s: %v", currency, paymentDate.Format("2006-01-02"), err)
		}
	}

	// Cache the result
	cacheMux.Lock()
	rateCache[cacheKey] = rate
	cacheMux.Unlock()

	return rate, nil
}

// fetchTCMBRate fetches rate from TCMB API for a specific date
func fetchTCMBRate(date time.Time, currency string) (float64, error) {
	url := fmt.Sprintf("https://www.tcmb.gov.tr/kurlar/%s/%s.xml",
		date.Format("200601"),
		date.Format("02012006"))

	resp, err := http.Get(url)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("TCMB API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}

	var data TarihDate
	if err := xml.Unmarshal(body, &data); err != nil {
		return 0, err
	}

	// Find the requested currency
	for _, curr := range data.Currency {
		if curr.CurrencyCode == currency {
			if curr.ForexSelling == 0 {
				return 0, fmt.Errorf("no forex selling rate available for %s", currency)
			}
			return curr.ForexSelling, nil
		}
	}

	return 0, fmt.Errorf("currency %s not found in TCMB data", currency)
}

// getPreviousBusinessDay returns the previous business day (excluding weekends)
func getPreviousBusinessDay(date time.Time) time.Time {
	prevDay := date.AddDate(0, 0, -1)

	// Go back to Friday if it's weekend
	for prevDay.Weekday() == time.Saturday || prevDay.Weekday() == time.Sunday {
		prevDay = prevDay.AddDate(0, 0, -1)
	}

	return prevDay
}

// tryPreviousDays tries to fetch rate by going back multiple days
func tryPreviousDays(startDate time.Time, currency string, maxDays int) (float64, error) {
	for i := 0; i < maxDays; i++ {
		date := startDate.AddDate(0, 0, -i)
		// Skip weekends
		if date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
			continue
		}

		rate, err := fetchTCMBRate(date, currency)
		if err == nil {
			return rate, nil
		}
	}

	return 0, fmt.Errorf("could not find exchange rate for %s in the last %d business days", currency, maxDays)
}

// ConvertToUSD converts any currency amount to USD
func ConvertToUSD(amount float64, currency string, paymentDate time.Time) (float64, float64, error) {
	if currency == "USD" {
		return amount, 1.0, nil
	}

	rate, err := GetExchangeRate(paymentDate, currency)
	if err != nil {
		return 0, 0, err
	}

	var amountUSD float64
	if currency == "TL" {
		// TL to USD: divide by TL/USD rate
		amountUSD = amount / rate
	} else if currency == "EUR" {
		// EUR to USD: need both EUR/TL and USD/TL rates
		eurRate, err := GetExchangeRate(paymentDate, "EUR")
		if err != nil {
			return 0, 0, err
		}
		usdRate, err := GetExchangeRate(paymentDate, "USD")
		if err != nil {
			return 0, 0, err
		}
		// EUR amount * (EUR/TL rate) / (USD/TL rate) = USD amount
		amountUSD = (amount * eurRate) / usdRate
		rate = eurRate / usdRate // Store the effective rate
	}

	return amountUSD, rate, nil
}

// ClearCache clears the exchange rate cache
func ClearCache() {
	cacheMux.Lock()
	defer cacheMux.Unlock()
	rateCache = make(map[string]float64)
}

// GetCacheSize returns the current cache size
func GetCacheSize() int {
	cacheMux.RLock()
	defer cacheMux.RUnlock()
	return len(rateCache)
}
