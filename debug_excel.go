package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/extrame/xls"
)

type RawPaymentData struct {
	MusteriAdiSoyadi string  `json:"musteri_adi_soyadi"`
	Tarih            string  `json:"tarih"`
	TahsilatSekli    string  `json:"tahsilat_sekli"`
	HesapAdi         string  `json:"hesap_adi"`
	OdenenTutar      float64 `json:"odenen_tutar"`
	OdenenDoviz      string  `json:"odenen_doviz"`
	ProjeAdi         string  `json:"proje_adi"`
}

func main() {
	filePath := `C:\Users\Net Mimar\Downloads\alooo.xls`
	
	fmt.Println("🔍 DEBUGGING EXCEL IMPORT WITH GO")
	fmt.Println("=" + repeatString("=", 49))
	
	// Step 1: Analyze the Excel file
	fmt.Println("\n=== EXCEL FILE ANALYSIS ===")
	fmt.Printf("File: %s\n", filePath)
	
	payments, err := parseExcelFile(filePath)
	if err != nil {
		log.Fatalf("❌ Failed to parse Excel file: %v", err)
	}
	
	fmt.Printf("✅ Successfully parsed %d payment records\n", len(payments))
	
	// Step 2: Analyze the data structure
	analyzePaymentData(payments)
	
	// Step 3: Show sample records
	showSampleRecords(payments, 5)
	
	// Step 4: Validate records
	validRecords, errors := validateRecords(payments)
	
	fmt.Printf("\n📊 VALIDATION SUMMARY:\n")
	fmt.Printf("Total records parsed: %d\n", len(payments))
	fmt.Printf("Valid records: %d\n", len(validRecords))
	fmt.Printf("Invalid records: %d\n", len(errors))
	
	if len(errors) > 0 {
		fmt.Println("\n❌ VALIDATION ERRORS:")
		for i, err := range errors {
			if i < 10 { // Show first 10 errors
				fmt.Printf("  %d. %s\n", i+1, err)
			}
		}
		if len(errors) > 10 {
			fmt.Printf("  ... and %d more errors\n", len(errors)-10)
		}
	}
	
	// Step 5: Export valid records to JSON for testing
	if len(validRecords) > 0 {
		exportToJSON(validRecords)
	}
}

func parseExcelFile(filePath string) ([]RawPaymentData, error) {
	// Open the Excel file
	xlFile, err := xls.Open(filePath, "utf-8")
	if err != nil {
		return nil, fmt.Errorf("failed to open Excel file: %v", err)
	}
	
	if xlFile.NumSheets() == 0 {
		return nil, fmt.Errorf("no sheets found in Excel file")
	}
	
	sheet := xlFile.GetSheet(0)
	if sheet == nil {
		return nil, fmt.Errorf("failed to get first sheet")
	}
	
	fmt.Printf("Using sheet: %s (rows: %d)\n", "Sheet1", sheet.MaxRow)
	
	if sheet.MaxRow < 2 {
		return nil, fmt.Errorf("sheet has no data rows")
	}
	
	// Get header row to understand column structure
	if row := sheet.Row(0); row != nil {
		headers := make([]string, 0)
		for colIndex := 0; colIndex < int(row.LastCol()); colIndex++ {
			cellValue := row.Col(colIndex)
			headers = append(headers, cellValue)
		}
		
		fmt.Println("\nColumns found:")
		for i, header := range headers {
			fmt.Printf("  %d. '%s'\n", i+1, header)
		}
		
		// Map column indices
		columnMap := mapColumns(headers)
		fmt.Println("\nColumn mapping:")
		for field, index := range columnMap {
			if index >= 0 {
				fmt.Printf("  ✅ %s -> Column %d ('%s')\n", field, index+1, headers[index])
			} else {
				fmt.Printf("  ❌ %s -> NOT FOUND\n", field)
			}
		}
		
		// Parse data rows
		var payments []RawPaymentData
		for rowIndex := 1; rowIndex <= int(sheet.MaxRow); rowIndex++ {
			row := sheet.Row(rowIndex)
			if row == nil {
				continue
			}
			
			payment, err := parseRowXLS(row, columnMap, rowIndex+1)
			if err != nil {
				fmt.Printf("⚠️  Row %d error: %v\n", rowIndex+1, err)
				continue
			}
			
			payments = append(payments, payment)
		}
		
		return payments, nil
	}
	
	return nil, fmt.Errorf("failed to read header row")
}

func mapColumns(headers []string) map[string]int {
	columnMap := map[string]int{
		"customer": -1,
		"date":     -1,
		"method":   -1,
		"account":  -1,
		"amount":   -1,
		"currency": -1,
		"project":  -1,
	}
	
	for i, header := range headers {
		headerLower := strings.ToLower(header)
		
		if contains(headerLower, []string{"müşteri", "musteri", "customer"}) {
			columnMap["customer"] = i
		} else if contains(headerLower, []string{"tarih", "date"}) {
			columnMap["date"] = i
		} else if contains(headerLower, []string{"tahsilat", "method", "şekli", "sekli"}) {
			columnMap["method"] = i
		} else if contains(headerLower, []string{"hesap", "account"}) {
			columnMap["account"] = i
		} else if contains(headerLower, []string{"tutar", "amount", "ödenen"}) {
			columnMap["amount"] = i
		} else if contains(headerLower, []string{"döviz", "doviz", "currency"}) {
			columnMap["currency"] = i
		} else if contains(headerLower, []string{"proje", "project"}) {
			columnMap["project"] = i
		}
	}
	
	return columnMap
}

func contains(text string, keywords []string) bool {
	for _, keyword := range keywords {
		if strings.Contains(text, keyword) {
			return true
		}
	}
	return false
}

func parseRowXLS(row *xls.Row, columnMap map[string]int, rowNumber int) (RawPaymentData, error) {
	payment := RawPaymentData{}
	
	// Get cell values safely
	getValue := func(colIndex int) string {
		if colIndex < 0 || colIndex >= int(row.LastCol()) {
			return ""
		}
		return strings.TrimSpace(row.Col(colIndex))
	}
	
	getFloatValue := func(colIndex int) (float64, error) {
		if colIndex < 0 || colIndex >= int(row.LastCol()) {
			return 0, fmt.Errorf("column index out of range")
		}
		cellValue := strings.TrimSpace(row.Col(colIndex))
		if cellValue == "" {
			return 0, fmt.Errorf("empty cell")
		}
		
		// Try to parse as float
		var amount float64
		_, err := fmt.Sscanf(cellValue, "%f", &amount)
		if err != nil {
			return 0, fmt.Errorf("invalid number format: %s", cellValue)
		}
		return amount, nil
	}
	
	// Extract values
	payment.MusteriAdiSoyadi = getValue(columnMap["customer"])
	payment.Tarih = getValue(columnMap["date"])
	payment.TahsilatSekli = getValue(columnMap["method"])
	payment.HesapAdi = getValue(columnMap["account"])
	payment.OdenenDoviz = getValue(columnMap["currency"])
	payment.ProjeAdi = getValue(columnMap["project"])
	
	// Parse amount
	amount, err := getFloatValue(columnMap["amount"])
	if err != nil {
		return payment, fmt.Errorf("invalid amount: %v", err)
	}
	payment.OdenenTutar = amount
	
	return payment, nil
}

func analyzePaymentData(payments []RawPaymentData) {
	fmt.Println("\n=== DATA ANALYSIS ===")
	
	// Count by currency
	currencyCount := make(map[string]int)
	// Count by project
	projectCount := make(map[string]int)
	// Count by method
	methodCount := make(map[string]int)
	
	totalAmount := 0.0
	
	for _, payment := range payments {
		currencyCount[payment.OdenenDoviz]++
		projectCount[payment.ProjeAdi]++
		methodCount[payment.TahsilatSekli]++
		totalAmount += payment.OdenenTutar
	}
	
	fmt.Println("Currencies:")
	for currency, count := range currencyCount {
		fmt.Printf("  %s: %d records\n", currency, count)
	}
	
	fmt.Println("Projects:")
	for project, count := range projectCount {
		fmt.Printf("  %s: %d records\n", project, count)
	}
	
	fmt.Println("Payment Methods:")
	for method, count := range methodCount {
		fmt.Printf("  %s: %d records\n", method, count)
	}
	
	fmt.Printf("Total Amount: %.2f\n", totalAmount)
}

func showSampleRecords(payments []RawPaymentData, count int) {
	fmt.Printf("\n=== SAMPLE RECORDS (First %d) ===\n", count)
	
	if len(payments) == 0 {
		fmt.Println("No records to show")
		return
	}
	
	for i := 0; i < count && i < len(payments); i++ {
		p := payments[i]
		fmt.Printf("\nRecord %d:\n", i+1)
		fmt.Printf("  Customer: %s\n", p.MusteriAdiSoyadi)
		fmt.Printf("  Date: %s\n", p.Tarih)
		fmt.Printf("  Amount: %.2f %s\n", p.OdenenTutar, p.OdenenDoviz)
		fmt.Printf("  Method: %s\n", p.TahsilatSekli)
		fmt.Printf("  Account: %s\n", p.HesapAdi)
		fmt.Printf("  Project: %s\n", p.ProjeAdi)
	}
}

func validateRecords(payments []RawPaymentData) ([]RawPaymentData, []string) {
	var validPayments []RawPaymentData
	var errors []string
	
	for i, payment := range payments {
		rowErrors := []string{}
		
		if payment.MusteriAdiSoyadi == "" {
			rowErrors = append(rowErrors, "empty customer name")
		}
		if payment.Tarih == "" {
			rowErrors = append(rowErrors, "empty date")
		}
		if payment.OdenenTutar <= 0 {
			rowErrors = append(rowErrors, "invalid amount")
		}
		if payment.OdenenDoviz == "" {
			rowErrors = append(rowErrors, "empty currency")
		}
		if payment.TahsilatSekli == "" {
			rowErrors = append(rowErrors, "empty payment method")
		}
		if payment.HesapAdi == "" {
			rowErrors = append(rowErrors, "empty account name")
		}
		if payment.ProjeAdi == "" {
			rowErrors = append(rowErrors, "empty project name")
		}
		
		if len(rowErrors) > 0 {
			errors = append(errors, fmt.Sprintf("Row %d (%s): %s", 
				i+1, payment.MusteriAdiSoyadi, strings.Join(rowErrors, ", ")))
		} else {
			validPayments = append(validPayments, payment)
		}
	}
	
	return validPayments, errors
}

func exportToJSON(payments []RawPaymentData) {
	fmt.Println("\n=== EXPORTING TO JSON ===")
	
	jsonData, err := json.MarshalIndent(payments, "", "  ")
	if err != nil {
		fmt.Printf("❌ Failed to marshal JSON: %v\n", err)
		return
	}
	
	filename := "debug_payments.json"
	err = os.WriteFile(filename, jsonData, 0644)
	if err != nil {
		fmt.Printf("❌ Failed to write JSON file: %v\n", err)
		return
	}
	
	fmt.Printf("✅ Exported %d valid payments to %s\n", len(payments), filename)
	fmt.Println("You can use this file to test the backend manually.")
}

func repeatString(s string, count int) string {
	result := ""
	for i := 0; i < count; i++ {
		result += s
	}
	return result
}