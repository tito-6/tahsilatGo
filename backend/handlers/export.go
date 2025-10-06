package handlers

import (
	"database/sql"
	"fmt"
	"net/http"

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
	query := `SELECT * FROM payments ORDER BY payment_date`
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
		)
		if err != nil {
			return nil, err
		}
		payments = append(payments, payment)
	}

	return payments, nil
}
