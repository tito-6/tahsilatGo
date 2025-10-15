package handlers

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware provides basic authentication
func AuthMiddleware() gin.HandlerFunc {
	return gin.BasicAuth(gin.Accounts{
		getUsername(): getPassword(),
	})
}

// getUsername returns the username from environment or default
func getUsername() string {
	username := os.Getenv("ADMIN_USERNAME")
	if username == "" {
		return "AhmetTahsilat2025*/" // Default username
	}
	return username
}

// getPassword returns the password from environment or default
func getPassword() string {
	password := os.Getenv("ADMIN_PASSWORD")
	if password == "" {
		return "1a124abf53c24bf1" // Default password
	}
	return password
}

// LoginHandler handles login requests
func LoginHandler(c *gin.Context) {
	var loginRequest struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&loginRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Check credentials
	if loginRequest.Username == getUsername() && loginRequest.Password == getPassword() {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Login successful",
			"token":   "basic-auth-token", // In a real app, use JWT
		})
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid username or password",
		})
	}
}

// CheckAuthHandler checks if user is authenticated
func CheckAuthHandler(c *gin.Context) {
	// If this handler is reached, the user is authenticated (via BasicAuth middleware)
	c.JSON(http.StatusOK, gin.H{
		"authenticated": true,
		"username":      getUsername(),
	})
}