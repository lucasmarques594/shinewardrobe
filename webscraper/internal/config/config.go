package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL    string
	Schedule       string
	MaxProducts    int
	LogLevel       string
	ChromeHeadless bool
	UserAgent      string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	config := &Config{
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://shinewardrobe:shinewardrobe123@localhost:5432/shinewardrobe?sslmode=disable"),
		Schedule:       getEnv("SCRAPER_SCHEDULE", "0 59 23 * * *"), 
		MaxProducts:    getEnvInt("SCRAPER_MAX_PRODUCTS", 50),
		LogLevel:       getEnv("LOG_LEVEL", "info"),
		ChromeHeadless: getEnvBool("CHROME_HEADLESS", true),
		UserAgent:      getEnv("USER_AGENT", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"),
	}

	return config, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		switch strings.ToLower(value) {
		case "true", "1", "yes", "on":
			return true
		case "false", "0", "no", "off":
			return false
		}
	}
	return defaultValue
}