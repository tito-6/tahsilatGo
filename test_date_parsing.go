package main

import (
	"fmt"
	"os"
	"strings"
	"tahsilat-raporu/models"
	"tahsilat-raporu/services"
)

func main() {
	fmt.Println("🧪 Testing Date Parsing - Turkish & English Support")
	fmt.Println(strings.Repeat("=", 60))

	// Initialize payment processor
	processor := services.NewPaymentProcessor()

	// Test cases for date parsing
	testDates := []string{
		// Turkish month names
		"02/ocak/2025",     // 02 January 2025
		"15/şubat/2024",    // 15 February 2024
		"10/mart/2023",     // 10 March 2023
		"25/nisan/2024",    // 25 April 2024
		"05/mayıs/2024",    // 05 May 2024
		"20/haziran/2024",  // 20 June 2024
		"31/temmuz/2024",   // 31 July 2024
		"08/ağustos/2024",  // 08 August 2024
		"12/eylül/2024",    // 12 September 2024
		"30/ekim/2024",     // 30 October 2024
		"11/kasım/2024",    // 11 November 2024
		"25/aralık/2024",   // 25 December 2024

		// English month names
		"15 January 2024",
		"28 February 2024",
		"10 March 2024",

		// Numeric formats
		"15/01/2024",       // DD/MM/YYYY
		"01/12/2024",       // DD/MM/YYYY
		"2024-03-15",       // YYYY-MM-DD
		"15.01.2024",       // DD.MM.YYYY

		// Edge cases
		"1/ocak/2024",      // Single digit day
		"31/aralık/2023",   // New Year's Eve
	}

	successCount := 0
	totalTests := len(testDates)

	fmt.Printf("Testing %d date formats...\n\n", totalTests)

	for i, dateStr := range testDates {
		fmt.Printf("Test %d: '%s'\n", i+1, dateStr)
		
		// Create a sample raw payment data
		rawPayment := models.RawPaymentData{
			MusteriAdiSoyadi: "Test Customer",
			Tarih:           dateStr,
			OdenenTutar:     100.0,
			OdenenDoviz:     "TL",
			TahsilatSekli:   "Banka Havalesi",
			HesapAdi:        "Test Account",
			ProjeAdi:        "MKM",
		}

		// Try to process the payment
		payment, err := processor.Process(rawPayment)
		if err != nil {
			fmt.Printf("❌ FAILED: %v\n", err)
		} else {
			fmt.Printf("✅ SUCCESS: %s -> %s\n", dateStr, payment.PaymentDate.Format("2006-01-02 (Monday)"))
			successCount++
		}
		fmt.Println()
	}

	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("📊 RESULTS: %d/%d tests passed (%.1f%%)\n", 
		successCount, totalTests, float64(successCount)/float64(totalTests)*100)

	if successCount == totalTests {
		fmt.Println("🎉 ALL TESTS PASSED! Date parsing is ready for deployment.")
	} else {
		fmt.Printf("⚠️  %d tests failed. Review the errors above.\n", totalTests-successCount)
	}

	// Test with a sample batch to ensure the full pipeline works
	fmt.Println("\n🔬 Testing Full Processing Pipeline...")
	
	testBatch := []models.RawPaymentData{
		{
			MusteriAdiSoyadi: "Ahmet Yılmaz",
			Tarih:           "15/ocak/2024",
			OdenenTutar:     5000.0,
			OdenenDoviz:     "TL",
			TahsilatSekli:   "Banka Havalesi",
			HesapAdi:        "İş Bankası MKM",
			ProjeAdi:        "MKM",
		},
		{
			MusteriAdiSoyadi: "Fatma Demir",
			Tarih:           "28/şubat/2024",
			OdenenTutar:     1200.0,
			OdenenDoviz:     "USD",
			TahsilatSekli:   "Çek",
			HesapAdi:        "Garanti MSM",
			ProjeAdi:        "MSM",
		},
		{
			MusteriAdiSoyadi: "John Smith",
			Tarih:           "10 March 2024",
			OdenenTutar:     2500.0,
			OdenenDoviz:     "EUR",
			TahsilatSekli:   "Nakit",
			HesapAdi:        "Cash MKM",
			ProjeAdi:        "MKM",
		},
	}

	processedPayments, errors := processor.ProcessBatch(testBatch)
	
	fmt.Printf("Batch Processing Results:\n")
	fmt.Printf("- Successfully processed: %d payments\n", len(processedPayments))
	fmt.Printf("- Errors encountered: %d\n", len(errors))

	if len(errors) > 0 {
		fmt.Println("\nErrors:")
		for _, err := range errors {
			fmt.Printf("  ❌ %s\n", err)
		}
	}

	if len(processedPayments) > 0 {
		fmt.Println("\nSuccessfully Processed Payments:")
		for i, payment := range processedPayments {
			fmt.Printf("  %d. %s - %s - %.2f %s (%.2f USD)\n", 
				i+1, payment.CustomerName, payment.PaymentDate.Format("2006-01-02"),
				payment.Amount, payment.Currency, payment.AmountUSD)
		}
	}

	fmt.Println("\n🚀 Date parsing test completed!")
	
	// Exit with appropriate code
	if successCount == totalTests && len(errors) == 0 {
		os.Exit(0) // Success
	} else {
		os.Exit(1) // Failure
	}
}