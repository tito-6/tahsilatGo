package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"

	"tahsilat-raporu/models"
	"tahsilat-raporu/services"

	"github.com/gin-gonic/gin"
	"github.com/jung-kurt/gofpdf"
	"github.com/xuri/excelize/v2"
)

// ExportHandler handles report export functionality
type ExportHandler struct {
	db *sql.DB
}

// NewExportHandler creates a new export handler
func NewExportHandler(db *sql.DB) *ExportHandler {
	return &ExportHandler{db: db}
}

// ExportExcel exports reports to Excel format
func (h *ExportHandler) ExportExcel(c *gin.Context) {
	// Get all payments
	payments, err := h.getAllPayments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Generate reports
	weeklyReports := services.GenerateWeeklyReports(payments)

	// Create Excel file
	f := excelize.NewFile()
	defer f.Close()

	// Create a sheet for each week
	for i, report := range weeklyReports {
		sheetName := fmt.Sprintf("Hafta %d", i+1)
		if i == 0 {
			f.SetSheetName("Sheet1", sheetName)
		} else {
			f.NewSheet(sheetName)
		}

		h.writeWeeklyReportToExcel(f, sheetName, report)
	}

	// Set response headers
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=tahsilat-raporu.xlsx")

	// Write file to response
	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write Excel file"})
		return
	}
}

// ExportPDF exports reports to PDF format
func (h *ExportHandler) ExportPDF(c *gin.Context) {
	// Get all payments
	payments, err := h.getAllPayments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Generate reports
	weeklyReports := services.GenerateWeeklyReports(payments)

	// Create PDF
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetFont("Arial", "", 12)

	for i, report := range weeklyReports {
		if i > 0 {
			pdf.AddPage()
		}
		h.writeWeeklyReportToPDF(pdf, report)
	}

	// Set response headers
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename=tahsilat-raporu.pdf")

	// Write PDF to response
	if err := pdf.Output(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write PDF file"})
		return
	}
}

// writeWeeklyReportToExcel writes a weekly report to an Excel sheet
func (h *ExportHandler) writeWeeklyReportToExcel(f *excelize.File, sheetName string, report models.WeeklyReport) {
	row := 1

	// Title
	title := fmt.Sprintf("MODEL KUYUM-MODEL SANAYİ MERKEZİ TAHSİLATLAR TABLOSU %s-%s",
		report.StartDate.Format("02/01/2006"),
		report.EndDate.Format("02/01/2006"))
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), title)
	f.MergeCell(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row))
	row += 2

	// Customer Summary Table
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "MÜŞTERİ ADI")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), "TOPLAM (USD)")
	row++

	totalCustomerUSD := 0.0
	for customer, amount := range report.CustomerSummary {
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), customer)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), amount)
		totalCustomerUSD += amount
		row++
	}

	// Customer total row
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "TOPLAM")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), totalCustomerUSD)
	row += 2

	// Payment Method Summary Table
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Ödeme Şekli")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), "Toplam TL")
	f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), "Toplam USD")
	row++

	totalMethodTL := 0.0
	totalMethodUSD := 0.0
	for method, totals := range report.PaymentMethods {
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), method)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), totals.TL)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), totals.USD)
		totalMethodTL += totals.TL
		totalMethodUSD += totals.USD
		row++
	}

	// Payment method total row
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Genel Toplam")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), totalMethodTL)
	f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), totalMethodUSD)
	row += 2

	// Project Summary Table
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Proje")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), "Tutar (USD)")
	row++

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "HAFTALIK MKM")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), report.ProjectSummary.MKM)
	row++

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "HAFTALIK MSM")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), report.ProjectSummary.MSM)
	row++

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "TOPLAM")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), report.ProjectSummary.MKM+report.ProjectSummary.MSM)
}

// writeWeeklyReportToPDF writes a weekly report to PDF
func (h *ExportHandler) writeWeeklyReportToPDF(pdf *gofpdf.Fpdf, report models.WeeklyReport) {
	// Title
	title := fmt.Sprintf("MODEL KUYUM-MODEL SANAYİ MERKEZİ TAHSİLATLAR TABLOSU %s-%s",
		report.StartDate.Format("02/01/2006"),
		report.EndDate.Format("02/01/2006"))
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(0, 10, title)
	pdf.Ln(15)

	// Customer Summary Table
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "Müşteri Özeti")
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(80, 6, "MÜŞTERİ ADI", "1", 0, "C", false, 0, "")
	pdf.CellFormat(30, 6, "TOPLAM (USD)", "1", 0, "C", false, 0, "")
	pdf.Ln(6)

	totalCustomerUSD := 0.0
	for customer, amount := range report.CustomerSummary {
		pdf.CellFormat(80, 6, customer, "1", 0, "L", false, 0, "")
		pdf.CellFormat(30, 6, fmt.Sprintf("$%.2f", amount), "1", 0, "R", false, 0, "")
		pdf.Ln(6)
		totalCustomerUSD += amount
	}

	// Customer total row
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(80, 6, "TOPLAM", "1", 0, "C", false, 0, "")
	pdf.CellFormat(30, 6, fmt.Sprintf("$%.2f", totalCustomerUSD), "1", 0, "R", false, 0, "")
	pdf.Ln(10)

	// Payment Method Summary Table
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "Ödeme Şekli Özeti")
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(50, 6, "Ödeme Şekli", "1", 0, "C", false, 0, "")
	pdf.CellFormat(30, 6, "Toplam TL", "1", 0, "C", false, 0, "")
	pdf.CellFormat(30, 6, "Toplam USD", "1", 0, "C", false, 0, "")
	pdf.Ln(6)

	totalMethodTL := 0.0
	totalMethodUSD := 0.0
	for method, totals := range report.PaymentMethods {
		pdf.CellFormat(50, 6, method, "1", 0, "L", false, 0, "")
		pdf.CellFormat(30, 6, fmt.Sprintf("₺%.2f", totals.TL), "1", 0, "R", false, 0, "")
		pdf.CellFormat(30, 6, fmt.Sprintf("$%.2f", totals.USD), "1", 0, "R", false, 0, "")
		pdf.Ln(6)
		totalMethodTL += totals.TL
		totalMethodUSD += totals.USD
	}

	// Payment method total row
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(50, 6, "Genel Toplam", "1", 0, "C", false, 0, "")
	pdf.CellFormat(30, 6, fmt.Sprintf("₺%.2f", totalMethodTL), "1", 0, "R", false, 0, "")
	pdf.CellFormat(30, 6, fmt.Sprintf("$%.2f", totalMethodUSD), "1", 0, "R", false, 0, "")
	pdf.Ln(10)

	// Project Summary Table
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "Proje Özeti")
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(50, 6, "Proje", "1", 0, "C", false, 0, "")
	pdf.CellFormat(30, 6, "Tutar (USD)", "1", 0, "C", false, 0, "")
	pdf.Ln(6)

	pdf.CellFormat(50, 6, "HAFTALIK MKM", "1", 0, "L", false, 0, "")
	pdf.CellFormat(30, 6, fmt.Sprintf("$%.2f", report.ProjectSummary.MKM), "1", 0, "R", false, 0, "")
	pdf.Ln(6)

	pdf.CellFormat(50, 6, "HAFTALIK MSM", "1", 0, "L", false, 0, "")
	pdf.CellFormat(30, 6, fmt.Sprintf("$%.2f", report.ProjectSummary.MSM), "1", 0, "R", false, 0, "")
	pdf.Ln(6)

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(50, 6, "TOPLAM", "1", 0, "C", false, 0, "")
	pdf.CellFormat(30, 6, fmt.Sprintf("$%.2f", report.ProjectSummary.MKM+report.ProjectSummary.MSM), "1", 0, "R", false, 0, "")
}

// getAllPayments retrieves all payments from the database
func (h *ExportHandler) getAllPayments() ([]models.PaymentRecord, error) {
	query := `SELECT id, customer_name, payment_date, amount, currency, payment_method, location, project, account_name, amount_usd, exchange_rate, created_at, raw_data FROM payments ORDER BY payment_date`
	rows, err := h.db.Query(query)
	if err != nil {
		return nil, err
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
			return nil, err
		}
		payments = append(payments, payment)
	}

	return payments, nil
}

// ExportYearlyExcel exports yearly report to Excel format
func (h *ExportHandler) ExportYearlyExcel(c *gin.Context) {
	yearStr := c.Param("year")
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid year parameter"})
		return
	}

	// Get payments for the year
	var payments []models.PaymentRecord
	query := `
		SELECT id, customer_name, amount, currency, payment_method, payment_date, 
		       account_name, project, location, amount_usd, exchange_rate, created_at, raw_data
		FROM payments 
		WHERE strftime('%Y', payment_date) = ?
		ORDER BY payment_date ASC`
	
	rows, err := h.db.Query(query, yearStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var payment models.PaymentRecord
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

	// Convert PaymentRecord slice to Payment slice for compatibility
	var paymentsForReport []models.Payment
	for _, pr := range payments {
		payment := models.Payment{
			ID:            pr.ID,
			CustomerName:  pr.CustomerName,
			Amount:        pr.Amount,
			Currency:      pr.Currency,
			PaymentMethod: pr.PaymentMethod,
			PaymentDate:   pr.PaymentDate,
			AccountName:   pr.AccountName,
			Project:       pr.Project,
			Location:      pr.Location,
			AmountUSD:     pr.AmountUSD,
			ExchangeRate:  pr.ExchangeRate,
			CreatedAt:     pr.CreatedAt,
		}
		paymentsForReport = append(paymentsForReport, payment)
	}

	// Generate yearly report
	yearlyReport := services.GenerateYearlyReport(paymentsForReport, year)

	// Create Excel file
	f := excelize.NewFile()
	defer f.Close()

	// Create yearly summary sheet
	sheetName := fmt.Sprintf("%d Yılı Tahsilat Raporu", year)
	f.SetSheetName("Sheet1", sheetName)
	
	h.writeYearlyReportToExcel(f, sheetName, yearlyReport)

	// Create monthly sheets
	if yearlyReport.MonthlyReports != nil {
		for _, monthReport := range yearlyReport.MonthlyReports {
			monthName := monthReport.Month.Format("2006-01 Ocak")
			if monthReport.Month.Month() == 2 {
				monthName = monthReport.Month.Format("2006-02 Şubat")
			} else if monthReport.Month.Month() == 3 {
				monthName = monthReport.Month.Format("2006-03 Mart")
			} else if monthReport.Month.Month() == 4 {
				monthName = monthReport.Month.Format("2006-04 Nisan")
			} else if monthReport.Month.Month() == 5 {
				monthName = monthReport.Month.Format("2006-05 Mayıs")
			} else if monthReport.Month.Month() == 6 {
				monthName = monthReport.Month.Format("2006-06 Haziran")
			} else if monthReport.Month.Month() == 7 {
				monthName = monthReport.Month.Format("2006-07 Temmuz")
			} else if monthReport.Month.Month() == 8 {
				monthName = monthReport.Month.Format("2006-08 Ağustos")
			} else if monthReport.Month.Month() == 9 {
				monthName = monthReport.Month.Format("2006-09 Eylül")
			} else if monthReport.Month.Month() == 10 {
				monthName = monthReport.Month.Format("2006-10 Ekim")
			} else if monthReport.Month.Month() == 11 {
				monthName = monthReport.Month.Format("2006-11 Kasım")
			} else if monthReport.Month.Month() == 12 {
				monthName = monthReport.Month.Format("2006-12 Aralık")
			}
			
			f.NewSheet(monthName)
			h.writeMonthlyReportToExcel(f, monthName, monthReport)
		}
	}

	// Set response headers
	filename := fmt.Sprintf("%d-yili-tahsilat-raporu.xlsx", year)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	// Write file to response
	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write Excel file"})
		return
	}
}

// writeYearlyReportToExcel writes a yearly report to an Excel sheet
func (h *ExportHandler) writeYearlyReportToExcel(f *excelize.File, sheetName string, report models.YearlyReport) {
	row := 1

	// Title
	title := fmt.Sprintf("%d YILI TAHSİLAT RAPORU", report.Year)
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), title)
	f.MergeCell(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("F%d", row))
	
	// Set title style
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 16},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("F%d", row), titleStyle)
	row += 2

	// Project Summary
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "YILLIK PROJE ÖZETİ")
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 12},
	})
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
	row++

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Proje")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), "Tutar (USD)")
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("B%d", row), headerStyle)
	row++

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "YILLIK MKM")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), fmt.Sprintf("%.2f", report.ProjectSummary.MKM))
	row++

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "YILLIK MSM")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), fmt.Sprintf("%.2f", report.ProjectSummary.MSM))
	row++

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "TOPLAM")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), fmt.Sprintf("%.2f", report.ProjectSummary.MKM+report.ProjectSummary.MSM))
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("B%d", row), headerStyle)
	row += 3

	// Payment Methods Summary - Three tables side by side
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "YILLIK PROJE BAZINDA ÖDEME ŞEKLİ DAĞILIMI")
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
	row += 2

	// MKM Table
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("%d YILI MKM TAHSİLATLAR", report.Year))
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
	
	// MSM Table
	f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), fmt.Sprintf("%d YILI MSM TAHSİLATLAR", report.Year))
	f.SetCellStyle(sheetName, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), headerStyle)
	
	// GENEL Table
	f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), fmt.Sprintf("%d YILI GENEL", report.Year))
	f.SetCellStyle(sheetName, fmt.Sprintf("G%d", row), fmt.Sprintf("G%d", row), headerStyle)
	row++

	// Headers for all three tables
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Ödeme Nedeni")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), "Toplam TL")
	f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), "Toplam USD")
	
	f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), "Ödeme Nedeni")
	f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), "Toplam TL")
	f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), "Toplam USD")
	
	f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), "Ödeme Nedeni")
	f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), "Toplam TL")
	f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), "Toplam USD")
	
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("I%d", row), headerStyle)
	row++

	// Payment method data
	methods := []string{"Banka Havalesi", "Nakit", "Çek"}
	for _, method := range methods {
		// MKM data
		mkmData := report.MKMPaymentMethods[method]
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), method)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), fmt.Sprintf("%.2f", mkmData.TL))
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), fmt.Sprintf("%.2f", mkmData.TotalUSD))
		
		// MSM data
		msmData := report.MSMPaymentMethods[method]
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), method)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), fmt.Sprintf("%.2f", msmData.TL))
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), fmt.Sprintf("%.2f", msmData.TotalUSD))
		
		// GENEL data (combined)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), method)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), fmt.Sprintf("%.2f", mkmData.TL+msmData.TL))
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), fmt.Sprintf("%.2f", mkmData.TotalUSD+msmData.TotalUSD))
		
		row++
	}

	// Totals row
	var mkmTotalTL, mkmTotalUSD, msmTotalTL, msmTotalUSD float64
	for _, data := range report.MKMPaymentMethods {
		mkmTotalTL += data.TL
		mkmTotalUSD += data.TotalUSD
	}
	for _, data := range report.MSMPaymentMethods {
		msmTotalTL += data.TL
		msmTotalUSD += data.TotalUSD
	}

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Genel Toplam")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), fmt.Sprintf("%.2f", mkmTotalTL))
	f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), fmt.Sprintf("%.2f", mkmTotalUSD))
	
	f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), "Toplam")
	f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), fmt.Sprintf("%.2f", msmTotalTL))
	f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), fmt.Sprintf("%.2f", msmTotalUSD))
	
	f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), "Toplam")
	f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), fmt.Sprintf("%.2f", mkmTotalTL+msmTotalTL))
	f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), fmt.Sprintf("%.2f", mkmTotalUSD+msmTotalUSD))
	
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("I%d", row), headerStyle)
	row += 3

	// Location Summary
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "YILLIK LOKASYON BAZLI TAHSİLAT DETAYLARI")
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
	row++

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Lokasyon")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), "MKM YILLIK (USD)")
	f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), "MSM YILLIK (USD)")
	f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), "TOPLAM (USD)")
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row), headerStyle)
	row++

	var totalMKM, totalMSM float64
	for location, summary := range report.LocationSummary {
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), location)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), fmt.Sprintf("%.2f", summary.MKM))
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), fmt.Sprintf("%.2f", summary.MSM))
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), fmt.Sprintf("%.2f", summary.Total))
		totalMKM += summary.MKM
		totalMSM += summary.MSM
		row++
	}

	// Location totals
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "TOPLAM")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), fmt.Sprintf("%.2f", totalMKM))
	f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), fmt.Sprintf("%.2f", totalMSM))
	f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), fmt.Sprintf("%.2f", totalMKM+totalMSM))
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row), headerStyle)

	// Auto-fit columns
	f.SetColWidth(sheetName, "A", "I", 15)
}

// writeMonthlyReportToExcel writes a monthly report to an Excel sheet
func (h *ExportHandler) writeMonthlyReportToExcel(f *excelize.File, sheetName string, report models.MonthlyReport) {
	row := 1

	// Title
	title := fmt.Sprintf("%s AYI TAHSİLAT RAPORU", report.Month.Format("2006 OCAK"))
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), title)
	f.MergeCell(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("F%d", row))
	
	// Set title style
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 16},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("F%d", row), titleStyle)
	row += 2

	// Project Summary
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "AYLIK PROJE ÖZETİ")
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 12},
	})
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
	row++

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Proje")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), "Tutar (USD)")
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("B%d", row), headerStyle)
	row++

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "AYLIK MKM")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), fmt.Sprintf("%.2f", report.ProjectSummary.MKM))
	row++

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "AYLIK MSM")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), fmt.Sprintf("%.2f", report.ProjectSummary.MSM))
	row++

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "TOPLAM")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), fmt.Sprintf("%.2f", report.ProjectSummary.MKM+report.ProjectSummary.MSM))
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("B%d", row), headerStyle)
	row += 3

	// Payment Methods Summary - Three tables side by side
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "AYLIK PROJE BAZINDA ÖDEME ŞEKLİ DAĞILIMI")
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
	row += 2

	// MKM Table
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "MKM TAHSİLATLAR")
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
	
	// MSM Table
	f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), "MSM TAHSİLATLAR")
	f.SetCellStyle(sheetName, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), headerStyle)
	
	// GENEL Table
	f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), "GENEL")
	f.SetCellStyle(sheetName, fmt.Sprintf("G%d", row), fmt.Sprintf("G%d", row), headerStyle)
	row++

	// Headers for all three tables
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Ödeme Nedeni")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), "Toplam TL")
	f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), "Toplam USD")
	
	f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), "Ödeme Nedeni")
	f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), "Toplam TL")
	f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), "Toplam USD")
	
	f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), "Ödeme Nedeni")
	f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), "Toplam TL")
	f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), "Toplam USD")
	
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("I%d", row), headerStyle)
	row++

	// Payment method data
	methods := []string{"Banka Havalesi", "Nakit", "Çek"}
	for _, method := range methods {
		// MKM data
		mkmData := report.MKMPaymentMethods[method]
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), method)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), fmt.Sprintf("%.2f", mkmData.TL))
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), fmt.Sprintf("%.2f", mkmData.TotalUSD))
		
		// MSM data
		msmData := report.MSMPaymentMethods[method]
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), method)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), fmt.Sprintf("%.2f", msmData.TL))
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), fmt.Sprintf("%.2f", msmData.TotalUSD))
		
		// GENEL data (combined)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), method)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), fmt.Sprintf("%.2f", mkmData.TL+msmData.TL))
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), fmt.Sprintf("%.2f", mkmData.TotalUSD+msmData.TotalUSD))
		
		row++
	}

	// Auto-fit columns
	f.SetColWidth(sheetName, "A", "I", 15)
}
