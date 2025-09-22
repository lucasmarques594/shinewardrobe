package scraper

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/chromedp/chromedp"
	"github.com/sirupsen/logrus"
)

type CASScraper struct {
	logger *logrus.Entry
}

func NewCASScraper(logger *logrus.Entry) *CASScraper {
	return &CASScraper{
		logger: logger.WithField("scraper", "ca"),
	}
}

func (c *CASScraper) GetName() string {
	return "C&A"
}

func (c *CASScraper) ScrapeProducts(ctx context.Context) ([]Product, error) {
	c.logger.Info("Starting C&A scraping...")

	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("disable-dev-shm-usage", true),
	)

	allocCtx, cancel := chromedp.NewExecAllocator(ctx, opts...)
	defer cancel()

	chromeCtx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	var products []Product

	categories := map[string]string{
		"camisetas-masculino": "https://www.cea.com.br/masculino/camisetas",
		"camisetas-feminino":  "https://www.cea.com.br/feminino/blusas-e-camisetas",
		"calcas-masculino":    "https://www.cea.com.br/masculino/calcas",
		"calcas-feminino":     "https://www.cea.com.br/feminino/calcas",
		"vestidos":            "https://www.cea.com.br/feminino/vestidos",
	}

	for categoryName, url := range categories {
		c.logger.WithField("category", categoryName).Info("Scraping category...")

		categoryProducts, err := c.scrapeCategory(chromeCtx, url, categoryName)
		if err != nil {
			c.logger.WithError(err).WithField("category", categoryName).Error("Failed to scrape category")
			continue
		}

		products = append(products, categoryProducts...)
		
		time.Sleep(2 * time.Second)
	}

	c.logger.WithField("total_products", len(products)).Info("C&A scraping completed")
	return products, nil
}

func (c *CASScraper) scrapeCategory(ctx context.Context, url, categoryName string) ([]Product, error) {
	var htmlContent string

	err := chromedp.Run(ctx,
		chromedp.Navigate(url),
		chromedp.Sleep(5*time.Second),
		chromedp.WaitVisible(".product-tile, .product-item, .item", chromedp.ByQuery),
		chromedp.InnerHTML("html", &htmlContent),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to load C&A page: %w", err)
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(htmlContent))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	var products []Product

	selectors := []string{
		".product-tile",
		".product-item",
		".item",
		"[data-testid='product-tile']",
		".product-card",
	}

	for _, selector := range selectors {
		items := doc.Find(selector)
		if items.Length() > 0 {
			items.Each(func(i int, s *goquery.Selection) {
				if i >= 12 { 
					return
				}

				product := c.extractProduct(s, categoryName)
				if product.Name != "" && product.Price > 0 {
					products = append(products, product)
				}
			})
			break
		}
	}

	return products, nil
}

func (c *CASScraper) extractProduct(s *goquery.Selection, categoryName string) Product {
	name := c.trySelectors(s, []string{
		".product-title",
		".product-name",
		".title",
		"h3",
		".name",
		"[data-testid='product-title']",
	})

	priceText := c.trySelectors(s, []string{
		".price-current",
		".price",
		".current-price",
		".price-value",
		"[data-testid='price']",
	})

	imageURL, _ := s.Find("img").First().Attr("src")
	if imageURL == "" {
		imageURL, _ = s.Find("img").First().Attr("data-src")
	}

	productURL, _ := s.Find("a").First().Attr("href")

	if imageURL != "" && !strings.HasPrefix(imageURL, "http") {
		imageURL = "https://www.cea.com.br" + imageURL
	}
	if productURL != "" && !strings.HasPrefix(productURL, "http") {
		productURL = "https://www.cea.com.br" + productURL
	}

	category, subcategory := c.categorizeProduct(categoryName, name)
	gender := determineGender(name, category)

	product := Product{
		Name:        strings.TrimSpace(name),
		Brand:       "C&A",
		Category:    category,
		Subcategory: subcategory,
		Price:       extractPrice(priceText),
		ImageURL:    imageURL,
		ProductURL:  productURL,
		Source:      "ca",
		Gender:      gender,
		Season:      "all",
		Weather:     determineWeatherSuitability(category, name),
		Sizes:       []string{"PP", "P", "M", "G", "GG"}, 
		Colors:      []string{"Variadas"},
	}

	originalPriceText := c.trySelectors(s, []string{
		".price-original",
		".old-price",
		".price-from",
		".was-price",
	})
	if originalPriceText != "" {
		originalPrice := extractPrice(originalPriceText)
		if originalPrice > product.Price {
			product.OriginalPrice = &originalPrice
		}
	}

	return product
}

func (c *CASScraper) trySelectors(s *goquery.Selection, selectors []string) string {
	for _, selector := range selectors {
		if text := strings.TrimSpace(s.Find(selector).First().Text()); text != "" {
			return text
		}
	}
	return ""
}

func (c *CASScraper) categorizeProduct(categoryName, productName string) (string, string) {
	lowerName := strings.ToLower(productName)
	lowerCategory := strings.ToLower(categoryName)

	if strings.Contains(lowerCategory, "camiseta") || strings.Contains(lowerName, "camiseta") {
		if strings.Contains(lowerName, "polo") {
			return "shirt", "polo"
		}
		return "shirt", "t-shirt"
	}

	if strings.Contains(lowerCategory, "calca") || strings.Contains(lowerName, "calça") {
		if strings.Contains(lowerName, "jeans") {
			return "pants", "jeans"
		}
		if strings.Contains(lowerName, "legging") {
			return "pants", "leggings"
		}
		return "pants", "casual"
	}

	if strings.Contains(lowerCategory, "vestido") || strings.Contains(lowerName, "vestido") {
		return "dress", "casual"
	}

	if strings.Contains(lowerName, "blusa") {
		return "shirt", "blouse"
	}

	return "shirt", "casual"
}