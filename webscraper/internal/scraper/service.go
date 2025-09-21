package scraper

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/sirupsen/logrus"
)

type Product struct {
	Name         string
	Brand        string
	Category     string
	Subcategory  string
	Price        float64
	OriginalPrice *float64
	ImageURL     string
	ProductURL   string
	Description  string
	Sizes        []string
	Colors       []string
	IsLuxury     bool
	IsEconomic   bool
	Source       string
	Gender       string
	Season       string
	Weather      []string
}

type Service struct {
	db     *sql.DB
	logger *logrus.Entry
	sites  []SiteScraper
}

type SiteScraper interface {
	GetName() string
	ScrapeProducts(ctx context.Context) ([]Product, error)
}

func NewService(db *sql.DB, logger *logrus.Entry) *Service {
	service := &Service{
		db:     db,
		logger: logger,
	}

	service.sites = []SiteScraper{
		NewZaraScraper(logger),
		NewRennerScraper(logger),
		NewCASScraper(logger),
		NewAmericanasScraper(logger),
	}

	return service
}

func (s *Service) ScrapeAll(ctx context.Context) error {
	s.logger.Info("Starting product scraping from all sites...")

	totalProducts := 0
	for _, scraper := range s.sites {
		products, err := s.scrapeFromSite(ctx, scraper)
		if err != nil {
			s.logger.WithError(err).WithField("site", scraper.GetName()).Error("Failed to scrape site")
			continue
		}

		saved, err := s.saveProducts(products)
		if err != nil {
			s.logger.WithError(err).WithField("site", scraper.GetName()).Error("Failed to save products")
			continue
		}

		totalProducts += saved
		s.logger.WithFields(logrus.Fields{
			"site": scraper.GetName(),
			"products": saved,
		}).Info("Successfully scraped and saved products")
	}

	s.logger.WithField("total_products", totalProducts).Info("Scraping completed")
	return nil
}

func (s *Service) scrapeFromSite(ctx context.Context, scraper SiteScraper) ([]Product, error) {
	// Create timeout context
	timeout := 5 * time.Minute
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	s.logger.WithField("site", scraper.GetName()).Info("Scraping products...")
	
	products, err := scraper.ScrapeProducts(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to scrape %s: %w", scraper.GetName(), err)
	}

	// Categorize products as economic or luxury based on price
	for i := range products {
		s.categorizeProduct(&products[i])
	}

	return products, nil
}

func (s *Service) categorizeProduct(product *Product) {
	// Simple price-based categorization
	// These thresholds can be adjusted based on market research
	economicThresholds := map[string]float64{
		"shirt":     80.0,  // Camisetas até R$ 80 = econômico
		"pants":     150.0, // Calças até R$ 150 = econômico
		"dress":     120.0, // Vestidos até R$ 120 = econômico
		"shoes":     200.0, // Sapatos até R$ 200 = econômico
		"jacket":    250.0, // Jaquetas até R$ 250 = econômico
		"accessory": 50.0,  // Acessórios até R$ 50 = econômico
	}

	luxuryThresholds := map[string]float64{
		"shirt":     300.0, // Camisetas acima de R$ 300 = luxo
		"pants":     500.0, // Calças acima de R$ 500 = luxo
		"dress":     600.0, // Vestidos acima de R$ 600 = luxo
		"shoes":     800.0, // Sapatos acima de R$ 800 = luxo
		"jacket":    800.0, // Jaquetas acima de R$ 800 = luxo
		"accessory": 200.0, // Acessórios acima de R$ 200 = luxo
	}

	category := strings.ToLower(product.Category)
	
	// Check if it's economic
	if threshold, exists := economicThresholds[category]; exists && product.Price <= threshold {
		product.IsEconomic = true
	}

	// Check if it's luxury
	if threshold, exists := luxuryThresholds[category]; exists && product.Price >= threshold {
		product.IsLuxury = true
	}

	// Default fallback if no category match
	if !product.IsEconomic && !product.IsLuxury {
		if product.Price <= 100.0 {
			product.IsEconomic = true
		} else if product.Price >= 400.0 {
			product.IsLuxury = true
		}
	}
}

func (s *Service) saveProducts(products []Product) (int, error) {
	if len(products) == 0 {
		return 0, nil
	}

	// Prepare batch insert
	query := `
		INSERT INTO products (
			name, brand, category, subcategory, price, original_price,
			image_url, product_url, description, sizes, colors,
			is_luxury, is_economic, source, gender, season, weather,
			scraped_at, created_at, updated_at
		) VALUES `

	values := []interface{}{}
	placeholders := []string{}

	for i, product := range products {
		placeholder := fmt.Sprintf("($%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d)",
			i*20+1, i*20+2, i*20+3, i*20+4, i*20+5, i*20+6,
			i*20+7, i*20+8, i*20+9, i*20+10, i*20+11, i*20+12,
			i*20+13, i*20+14, i*20+15, i*20+16, i*20+17, i*20+18,
			i*20+19, i*20+20)
		
		placeholders = append(placeholders, placeholder)
		
		// Convert slices to JSON
		sizesJSON := fmt.Sprintf("[%s]", strings.Join(s.quoteStrings(product.Sizes), ","))
		colorsJSON := fmt.Sprintf("[%s]", strings.Join(s.quoteStrings(product.Colors), ","))
		weatherJSON := fmt.Sprintf("[%s]", strings.Join(s.quoteStrings(product.Weather), ","))

		values = append(values,
			product.Name, product.Brand, product.Category, product.Subcategory,
			product.Price, product.OriginalPrice, product.ImageURL, product.ProductURL,
			product.Description, sizesJSON, colorsJSON, product.IsLuxury,
			product.IsEconomic, product.Source, product.Gender, product.Season,
			weatherJSON, time.Now(), time.Now(), time.Now(),
		)
	}

	query += strings.Join(placeholders, ",")
	query += ` ON CONFLICT (product_url) DO UPDATE SET
		price = EXCLUDED.price,
		original_price = EXCLUDED.original_price,
		is_available = true,
		scraped_at = EXCLUDED.scraped_at,
		updated_at = EXCLUDED.updated_at`

	result, err := s.db.Exec(query, values...)
	if err != nil {
		return 0, fmt.Errorf("failed to insert products: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	return int(rowsAffected), nil
}

func (s *Service) quoteStrings(strs []string) []string {
	quoted := make([]string, len(strs))
	for i, str := range strs {
		quoted[i] = fmt.Sprintf(`"%s"`, strings.ReplaceAll(str, `"`, `\"`))
	}
	return quoted
}

// Utility functions for scraping

func extractPrice(priceText string) float64 {
	// Remove currency symbols and clean up
	cleaned := strings.ReplaceAll(priceText, "R$", "")
	cleaned = strings.ReplaceAll(cleaned, "$", "")
	cleaned = strings.ReplaceAll(cleaned, ".", "")
	cleaned = strings.ReplaceAll(cleaned, ",", ".")
	cleaned = strings.TrimSpace(cleaned)

	price, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		return 0.0
	}
	return price
}

func extractSizes(doc *goquery.Document) []string {
	sizes := []string{}
	doc.Find("[data-size], .size-option, .size-selector option").Each(func(i int, s *goquery.Selection) {
		size := strings.TrimSpace(s.Text())
		if size != "" && size != "Selecione" {
			sizes = append(sizes, size)
		}
	})
	return sizes
}

func extractColors(doc *goquery.Document) []string {
	colors := []string{}
	doc.Find("[data-color], .color-option, .color-name").Each(func(i int, s *goquery.Selection) {
		color := strings.TrimSpace(s.Text())
		if color != "" {
			colors = append(colors, color)
		}
	})
	return colors
}

func determineGender(productName, category string) string {
	lowerName := strings.ToLower(productName + " " + category)
	
	femaleKeywords := []string{"feminino", "mulher", "blusa", "saia", "vestido", "salto"}
	maleKeywords := []string{"masculino", "homem", "camisa", "gravata", "terno"}
	
	for _, keyword := range femaleKeywords {
		if strings.Contains(lowerName, keyword) {
			return "female"
		}
	}
	
	for _, keyword := range maleKeywords {
		if strings.Contains(lowerName, keyword) {
			return "male"
		}
	}
	
	return "unisex"
}

func determineWeatherSuitability(category, description string) []string {
	lower := strings.ToLower(category + " " + description)
	weather := []string{}
	
	if strings.Contains(lower, "verão") || strings.Contains(lower, "algodão") || 
	   strings.Contains(lower, "leve") || strings.Contains(lower, "respirável") {
		weather = append(weather, "hot", "sunny")
	}
	
	if strings.Contains(lower, "inverno") || strings.Contains(lower, "lã") || 
	   strings.Contains(lower, "casaco") || strings.Contains(lower, "jaqueta") {
		weather = append(weather, "cold")
	}
	
	if strings.Contains(lower, "impermeável") || strings.Contains(lower, "chuva") {
		weather = append(weather, "rain")
	}
	
	if len(weather) == 0 {
		weather = []string{"sunny", "cloudy"}
	}
	
	return weather
}