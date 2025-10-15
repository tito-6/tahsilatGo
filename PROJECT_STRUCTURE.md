# Tahsilat Raporu - Payment Collection Report System

This project contains:

## Backend (Go)
- Location: `/backend`
- Entry point: `backend/main.go`
- Port: 8080
- Database: SQLite

## Frontend (React)
- Location: `/frontend`
- Build: `npm run build`
- Serve: Static files from `/frontend/build`

## Deployment
- Backend: Uses Dockerfile in `/backend/Dockerfile`
- Frontend: Can be deployed separately or served by backend

## Environment Variables
- `ADMIN_USERNAME`: Admin username (default: AhmetTahsilat2025*/)
- `ADMIN_PASSWORD`: Admin password (default: 1a124abf53c24bf1)
- `PORT`: Server port (default: 8080)