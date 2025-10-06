# Tahsilat Raporu - Payment Collection Reporting System

A comprehensive web application for tracking and reporting customer payments across multiple construction projects (Model Kuyum Merkezi - MKM and Model Sanayi Merkezi - MSM) with multi-currency support and automatic exchange rate conversion.

## Features

- **Excel/CSV Import**: Upload payment data from Excel or CSV files
- **Multi-Currency Support**: Handle TL, USD, and EUR payments
- **Automatic Exchange Rate Conversion**: Real-time TCMB exchange rate integration
- **Weekly Reports**: Generate detailed weekly payment summaries
- **Monthly Reports**: Aggregate monthly payment data
- **Export Functionality**: Export reports to Excel and PDF formats
- **Responsive Design**: Modern, mobile-friendly interface

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Go (Golang) with Gin framework
- **Database**: SQLite
- **Excel Processing**: SheetJS (frontend) + excelize (Go backend)
- **PDF Export**: gofpdf (Go backend)

## Project Structure

```
tahsilat-raporu/
├── backend/
│   ├── handlers/          # HTTP request handlers
│   ├── services/          # Business logic services
│   ├── models/            # Data models
│   └── main.go           # Main application entry point
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API services
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript type definitions
│   └── public/           # Static assets
└── README.md
```

## Getting Started

### Prerequisites

- Go 1.19 or higher
- Node.js 16 or higher
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   go mod tidy
   ```

3. Run the server:
   ```bash
   go run main.go
   ```

The backend server will start on `http://localhost:8080`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000`

## Usage

### File Upload

1. Prepare your Excel/CSV file with the following columns:
   - **Müşteri Adı** (Customer Name) - string
   - **Ödeme Tarihi** (Payment Date) - DD/MM/YYYY format
   - **Tutar** (Amount) - numeric
   - **Para Birimi** (Currency) - TL, USD, or EUR
   - **Ödeme Şekli** (Payment Method) - Nakit, Banka Havalesi, Çek
   - **Proje** (Project) - MKM or MSM
   - **Hesap Adı** (Account Name) - string
   - **Mülk Adı** (Property Name) - optional string

2. Upload the file using the drag-and-drop interface or file picker

3. The system will automatically:
   - Parse and validate the data
   - Convert currencies to USD using TCMB exchange rates
   - Generate weekly and monthly reports

### Reports

The system generates two types of reports:

#### Weekly Reports
- Customer payment summaries
- Payment method breakdowns
- Project-wise totals
- Location-based collections

#### Monthly Reports
- Monthly project summaries
- Location-based collection details
- Aggregated totals

### Export

Export reports in two formats:
- **Excel**: Multi-sheet workbook with formatted tables
- **PDF**: Professional layout with company branding

## API Endpoints

- `POST /api/upload` - Upload payment data
- `GET /api/payments` - Get all payments
- `GET /api/reports` - Get generated reports
- `GET /api/export/excel` - Export Excel report
- `GET /api/export/pdf` - Export PDF report
- `GET /health` - Health check

## Exchange Rate Integration

The system integrates with TCMB (Turkish Central Bank) API to fetch real-time exchange rates:

- **API Endpoint**: `https://www.tcmb.gov.tr/kurlar/YYYYMM/DDMMYYYY.xml`
- **Rate Logic**: Uses previous business day rates
- **Caching**: Implements in-memory caching to minimize API calls
- **Fallback**: Goes back up to 7 business days if rate not available

## Database Schema

The SQLite database contains a single `payments` table with the following structure:

```sql
CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    payment_date DATETIME NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    project TEXT NOT NULL,
    account_name TEXT NOT NULL,
    property_name TEXT,
    amount_usd REAL NOT NULL,
    exchange_rate REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Development

### Backend Development

The backend follows a clean architecture pattern:
- **Handlers**: Handle HTTP requests and responses
- **Services**: Contain business logic
- **Models**: Define data structures

### Frontend Development

The frontend uses modern React patterns:
- **Functional Components**: With hooks
- **TypeScript**: For type safety
- **Tailwind CSS**: For styling
- **Service Layer**: For API communication

## Deployment

### Backend Deployment

The Go backend can be deployed to any platform that supports Go:
- **Render**: Simple deployment with automatic builds
- **Railway**: Easy deployment with database integration
- **Heroku**: Traditional PaaS deployment
- **Docker**: Containerized deployment

### Frontend Deployment

The React frontend can be deployed to:
- **Netlify**: Automatic deployments from Git
- **Vercel**: Optimized for React applications
- **GitHub Pages**: Free static hosting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.
