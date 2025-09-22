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

type RennerScraper struct {
	logger *logrus.Entry
}

func NewRennerScraper(logger *logrus.Entry) *RennerScraper {
	return &RennerScraper{
		logger: logger.WithField("scraper", "renner"),
	}
}

func (r *RennerScraper) GetName() string {
	return "Renner"
}

func (r *RennerScraper) ScrapeProducts(ctx context.Context) ([]Product, error) {
	r.logger.Info("Starting Renner scraping...")

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
		"camisetas-masculino": "https://www.lojasrenner.com.br/c/moda-masculina/camisetas",
		"camisetas-feminino":  "https://www.lojasrenner.com.br/c/moda-feminina/blusas-e-camisetas",
		"calcas-masculino":    "https://www.lojasrenner.com.br/c/moda-masculina/calcas",
		"calcas-feminino":     "https://www.lojasrenner.com.br/c/moda-feminina/calcas",
	}

	for categoryName, url := range categories {
		r.logger.WithField("category", categoryName).Info("Scraping category...")

		categoryProducts, err := r.scrapeCategory(chromeCtx, url, categoryName)
		if err != nil {
			r.logger.WithError(err).WithField("category", categoryName).Error("Failed to scrape category")
			continue
		}

		products = append(products, categoryProducts...)
		
		time.Sleep(3 * time.Second)
	}

	r.logger.WithField("total_products", len(products)).Info("Renner scraping completed")
	return products, nil
}

func (r *RennerScraper) scrapeCategory(ctx context.Context, url, categoryName string) ([]Product, error) {
	var htmlContent string

	err := chromedp.Run(ctx,
		chromedp.Navigate(url),
		chromedp.Sleep(4*time.Second),
		chromedp.WaitVisible(".showcase-item, .product-item, .item", chromedp.ByQuery),
		chromedp.InnerHTML("html", &htmlContent),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to load Renner page: %w", err)
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(htmlContent))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	var products []Product

	selectors := []string{
		".showcase-item",
		".product-item",
		".item",
		"[data-testid='product-card']",
	}

	for _, selector := range selectors {
		items := doc.Find(selector)
		if items.Length() > 0 {
			items.Each(func(i int, s *goquery.Selection) {
				if i >= 15 { 
					return
				}

				product := r.extractProduct(s, categoryName)
				if product.Name != "" && product.Price > 0 {
					products = append(products, product)
				}
			})
			break 
		}
	}

	return products, nil
}

func (r *RennerScraper) extractProduct(s *goquery.Selection, categoryName string) Product {
	name := r.trySelectors(s, []string{
		".product-name",
		".item-name",
		".showcase-item-name",
		"h3",
		".title",
		"[data-testid='product-name']",
	})

	priceText := r.trySelectors(s, []string{
		".price-value",
		".price",
		".showcase-item-price",
		".preco-promocional",
		".preco",
		"[data-testid='price']",
	})

	imageURL, _ := s.Find("img").First().Attr("src")
	if imageURL == "" {
		imageURL, _ = s.Find("img").First().Attr("data-src")
	}

	productURL, _ := s.Find("a").First().Attr("href")

	if imageURL != "" && !strings.HasPrefix(imageURL, "http") {
		imageURL = "https://www.lojasrenner.com.br" + imageURL
	}
	if productURL != "" && !strings.HasPrefix(productURL, "http") {
		productURL = "https://www.lojasrenner.com.br" + productURL
	}

	category, subcategory := r.categorizeProduct(categoryName, name)
	gender := determineGender(name, category)

	product := Product{
		Name:        strings.TrimSpace(name),
		Brand:       "Renner",
		Category:    category,
		Subcategory: subcategory,
		Price:       extractPrice(priceText),
		ImageURL:    imageURL,
		ProductURL:  productURL,
		Source:      "renner",
		Gender:      gender,
		Season:      "all",
		Weather:     determineWeatherSuitability(category, name),
		Sizes:       []string{"P", "M", "G", "GG", "XG"}, 
		Colors:      []string{"Variadas"},
	}

	originalPriceText := r.trySelectors(s, []string{
		".price-old",
		".preco-original",
		".price-from",
		".old-price",
	})
	if originalPriceText != "" {
		originalPrice := extractPrice(originalPriceText)
		if originalPrice > product.Price {
			product.OriginalPrice = &originalPrice
		}
	}

	return product
}

func (r *RennerScraper) trySelectors(s *goquery.Selection, selectors []string) string {
	for _, selector := range selectors {
		if text := strings.TrimSpace(s.Find(selector).First().Text()); text != "" {
			return text
		}
	}
	return ""
}

func (r *RennerScraper) categorizeProduct(categoryName, productName string) (string, string) {
	lowerName := strings.ToLower(productName)
	lowerCategory := strings.ToLower(categoryName)

	if strings.Contains(lowerCategory, "camiseta") || strings.Contains(lowerName, "camiseta") {
		if strings.Contains(lowerName, "polo") {
			return "shirt", "polo"
		}
		if strings.Contains(lowerName, "regata") {
			return "shirt", "tank-top"
		}
		return "shirt", "t-shirt"
	}

	if strings.Contains(lowerCategory, "calca") || strings.Contains(lowerName, "calça") {
		if strings.Contains(lowerName, "jeans") {
			return "pants", "jeans"
		}
		if strings.Contains(lowerName, "social") {
			return "pants", "dress-pants"
		}
		if strings.Contains(lowerName, "short") || strings.Contains(lowerName, "bermuda") {
			return "pants", "shorts"
		}
		return "pants", "casual"
	}

	if strings.Contains(lowerName, "vestido") {
		return "dress", "casual"
	}

	if strings.Contains(lowerName, "blusa") {
		return "shirt", "blouse"
	}

	if strings.Contains(lowerName, "jaqueta") || strings.Contains(lowerName, "casaco") {
		return "jacket", "casual"
	}

	return "shirt", "casual"
}