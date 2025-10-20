package main

import (
	"database/sql"
	"log"
	"net/http"
	"strings"

	"tahsilat-raporu/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "modernc.org/sqlite"
)

func main() {
	// Initialize database
	db, err := initDB()
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	// Initialize Gin router
	r := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{
		"http://localhost:3000", 
		"http://localhost:3001",
		"https://tahsilatgo-production.up.railway.app", // Specific Railway domain
		"https://*.railway.app", // Allow all Railway domains
		"https://*.vercel.app",  // Allow Vercel domains
	}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.AllowCredentials = true
	r.Use(cors.New(config))

	// Initialize handlers
	uploadHandler := handlers.NewUploadHandler(db)
	exportHandler := handlers.NewExportHandler(db)

	// Public routes (no authentication)
	public := r.Group("/api/public")
	{
		public.POST("/login", handlers.LoginHandler)
	}

	// Protected API routes (require authentication)
	api := r.Group("/api")
	api.Use(handlers.AuthMiddleware()) // Apply authentication middleware
	{
		api.GET("/auth/check", handlers.CheckAuthHandler)
		api.POST("/upload", uploadHandler.UploadPayments)
		api.POST("/analyze", uploadHandler.GetRawPaymentInfo)     // Add analyze endpoint
		api.GET("/payments", uploadHandler.GetPayments)
		api.GET("/reports", uploadHandler.GetReports)
		api.GET("/reports/yearly/:year", uploadHandler.GetYearlyReport) // Add yearly report endpoint
		api.DELETE("/payments", uploadHandler.ClearAllPayments) // Add clear endpoint
		api.DELETE("/payments/:id", uploadHandler.DeletePayment) // Add individual payment delete endpoint
		api.PUT("/payments/:id/kdv", uploadHandler.UpdatePaymentKDV) // Add KDV update endpoint
		api.DELETE("/payments/date-range", uploadHandler.DeletePaymentsByDateRange) // Add date range delete endpoint
		api.GET("/stats", uploadHandler.GetDatabaseStats)       // Add stats endpoint
		api.GET("/audit/report", uploadHandler.AuditReportGeneration) // Add report audit endpoint
		api.GET("/export/excel", exportHandler.ExportExcel)
		api.GET("/export/yearly/excel/:year", exportHandler.ExportYearlyExcel) // Add yearly Excel export
		api.GET("/export/pdf", exportHandler.ExportPDF)
	}

	// Serve static files from React build
	r.Static("/static", "./frontend/build/static")
	r.StaticFile("/favicon.ico", "./frontend/build/favicon.ico")
	r.StaticFile("/manifest.json", "./frontend/build/manifest.json")
	r.StaticFile("/robots.txt", "./frontend/build/robots.txt")
	
	// Serve React app for all non-API routes
	r.NoRoute(func(c *gin.Context) {
		// For API routes that weren't found, return JSON 404
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "API route not found"})
			return
		}
		// For all other routes, serve the React app
		c.File("./frontend/build/index.html")
	})

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Start server
	log.Println("Server starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

// initDB initializes the SQLite database and creates tables
func initDB() (*sql.DB, error) {
	db, err := sql.Open("sqlite", "./payments.db")
	if err != nil {
		return nil, err
	}

	// Create payments table with KDV support
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS payments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		customer_name TEXT NOT NULL,
		payment_date DATETIME NOT NULL,
		amount REAL NOT NULL,
		currency TEXT NOT NULL,
		payment_method TEXT NOT NULL,
		location TEXT NOT NULL,
		project TEXT NOT NULL,
		account_name TEXT NOT NULL,
		amount_usd REAL NOT NULL,
		exchange_rate REAL NOT NULL,
		raw_data TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		includes_kdv BOOLEAN DEFAULT FALSE,
		kdv_amount REAL,
		kdv_rate REAL,
		kdv_note TEXT
	);
	`

	if _, err := db.Exec(createTableSQL); err != nil {
		return nil, err
	}

	// Add raw_data column if it doesn't exist (for existing databases)
	alterTableSQL := `ALTER TABLE payments ADD COLUMN raw_data TEXT`
	db.Exec(alterTableSQL) // Ignore error - column might already exist
	
	// Add KDV columns if they don't exist (for existing databases)
	kdvAlterSQL := []string{
		`ALTER TABLE payments ADD COLUMN includes_kdv BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE payments ADD COLUMN kdv_amount REAL`,
		`ALTER TABLE payments ADD COLUMN kdv_rate REAL`,
		`ALTER TABLE payments ADD COLUMN kdv_note TEXT`,
	}
	for _, sql := range kdvAlterSQL {
		db.Exec(sql) // Ignore errors - columns might already exist
	}

	// Create indexes for better performance
	indexSQL := `
	CREATE INDEX IF NOT EXISTS idx_payment_date ON payments(payment_date);
	CREATE INDEX IF NOT EXISTS idx_customer_name ON payments(customer_name);
	CREATE INDEX IF NOT EXISTS idx_project ON payments(project);
	`

	if _, err := db.Exec(indexSQL); err != nil {
		return nil, err
	}

	return db, nil
}
