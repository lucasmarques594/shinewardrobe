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

type AmericanasScraper struct {
	logger *logrus.Entry
}

func NewAmericanasScraper(logger *logrus.Entry) *AmericanasScraper {
	return &AmericanasScraper{
		logger: logger.WithField("scraper", "americanas"),
	}
}

func (a *AmericanasScraper) GetName() string {
	return "Americanas"
}

func (a *AmericanasScraper) ScrapeProducts(ctx context.Context) ([]Product, error) {
	a.logger.Info("Starting Americanas scraping...")

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

	searches := map[string]string{
		"camisetas-masculino": "https://www.americanas.com.br/busca/camiseta-masculina",
		"camisetas-feminino":  "https://www.americanas.com.br/busca/camiseta-feminina",
		"calcas-masculino":    "https://www.americanas.com.br/busca/calca-masculina",
		"calcas-feminino":     "https://www.americanas.com.br/busca/calca-feminina",
		"vestidos":            "https://www.americanas.com.br/busca/vestido",
	}

	for categoryName, url := range searches {
		a.logger.WithField("category", categoryName).Info("Scraping category...")

		categoryProducts, err := a.scrapeCategory(chromeCtx, url, categoryName)
		if err != nil {
			a.logger.WithError(err).WithField("category", categoryName).Error("Failed to scrape category")
			continue
		}

		products = append(products, categoryProducts...)
		
		time.Sleep(4 * time.Second)
	}

	a.logger.WithField("total_products", len(products)).Info("Americanas scraping completed")
	return products, nil
}

func (a *AmericanasScraper) scrapeCategory(ctx context.Context, url, categoryName string) ([]Product, error) {
	var htmlContent string

	err := chromedp.Run(ctx,
		chromedp.Navigate(url),
		chromedp.Sleep(6*time.Second), 
		chromedp.WaitVisible(".product-grid-item, .product-item, .col-product", chromedp.ByQuery),
		chromedp.InnerHTML("html", &htmlContent),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to load Americanas page: %w", err)
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(htmlContent))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	var products []Product

	selectors := []string{
		".product-grid-item",
		".product-item",
		".col-product",
		"[data-testid='product-card']",
		".product",
	}

	for _, selector := range selectors {
		items := doc.Find(selector)
		if items.Length() > 0 {
			items.Each(func(i int, s *goquery.Selection) {
				if i >= 10 { 
					return
				}

				product := a.extractProduct(s, categoryName)
				if product.Name != "" && product.Price > 0 {
					products = append(products, product)
				}
			})
			break
		}
	}

	return products, nil
}

func (a *AmericanasScraper) extractProduct(s *goquery.Selection, categoryName string) Product {
	name := a.trySelectors(s, []string{
		".product-title",
		".product-name",
		".title",
		"h2",
		"h3",
		".name",
		"[data-testid='product-name']",
	})

	priceText := a.trySelectors(s, []string{
		".price-value",
		".price",
		".current-price",
		".sales-price",
		"[data-testid='price-value']",
	})

	imageURL, _ := s.Find("img").First().Attr("src")
	if imageURL == "" {
		imageURL, _ = s.Find("img").First().Attr("data-src")
	}
	if imageURL == "" {
		imageURL, _ = s.Find("img").First().Attr("data-original")
	}

	productURL, _ := s.Find("a").First().Attr("href")

	if imageURL != "" && !strings.HasPrefix(imageURL, "http") {
		if strings.HasPrefix(imageURL, "//") {
			imageURL = "https:" + imageURL
		} else {
			imageURL = "https://www.americanas.com.br" + imageURL
		}
	}
	if productURL != "" && !strings.HasPrefix(productURL, "http") {
		productURL = "https://www.americanas.com.br" + productURL
	}

	category, subcategory := a.categorizeProduct(categoryName, name)
	gender := determineGender(name, category)

	product := Product{
		Name:        strings.TrimSpace(name),
		Brand:       a.extractBrand(name),
		Category:    category,
		Subcategory: subcategory,
		Price:       extractPrice(priceText),
		ImageURL:    imageURL,
		ProductURL:  productURL,
		Source:      "americanas",
		Gender:      gender,
		Season:      "all",
		Weather:     determineWeatherSuitability(category, name),
		Sizes:       []string{"P", "M", "G", "GG"}, 
		Colors:      []string{"Variadas"},
	}

	originalPriceText := a.trySelectors(s, []string{
		".list-price",
		".old-price",
		".price-from",
		".was-price",
		"[data-testid='list-price']",
	})
	if originalPriceText != "" {
		originalPrice := extractPrice(originalPriceText)
		if originalPrice > product.Price {
			product.OriginalPrice = &originalPrice
		}
	}

	return product
}

func (a *AmericanasScraper) trySelectors(s *goquery.Selection, selectors []string) string {
	for _, selector := range selectors {
		if text := strings.TrimSpace(s.Find(selector).First().Text()); text != "" {
			return text
		}
	}
	return ""
}

func (a *AmericanasScraper) extractBrand(productName string) string {
	brands := []string{
		"Nike", "Adidas", "Puma", "Hering", "Malwee", 
		"Lacoste", "Calvin Klein", "Tommy Hilfiger", "Polo Ralph Lauren",
		"Levi's", "Wrangler", "Osklen", "Colcci", "Ellus",
	}

	lowerName := strings.ToLower(productName)
	for _, brand := range brands {
		if strings.Contains(lowerName, strings.ToLower(brand)) {
			return brand
		}
	}

	return "Americanas"
}

func (a *AmericanasScraper) categorizeProduct(categoryName, productName string) (string, string) {
	lowerName := strings.ToLower(productName)
	lowerCategory := strings.ToLower(categoryName)

	if strings.Contains(lowerCategory, "camiseta") || strings.Contains(lowerName, "camiseta") {
		if strings.Contains(lowerName, "polo") {
			return "shirt", "polo"
		}
		if strings.Contains(lowerName, "regata") {
			return "shirt", "tank-top"
		}
		if strings.Contains(lowerName, "manga longa") {
			return "shirt", "long-sleeve"
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
		if strings.Contains(lowerName, "social") {
			return "pants", "dress-pants"
		}
		if strings.Contains(lowerName, "moletom") {
			return "pants", "sweatpants"
		}
		return "pants", "casual"
	}

	if strings.Contains(lowerCategory, "vestido") || strings.Contains(lowerName, "vestido") {
		if strings.Contains(lowerName, "longo") {
			return "dress", "long"
		}
		if strings.Contains(lowerName, "midi") {
			return "dress", "midi"
		}
		return "dress", "casual"
	}

	if strings.Contains(lowerName, "blusa") {
		return "shirt", "blouse"
	}

	if strings.Contains(lowerName, "moletom") || strings.Contains(lowerName, "casaco") {
		return "jacket", "hoodie"
	}

	if strings.Contains(lowerName, "tênis") || strings.Contains(lowerName, "sapato") {
		return "shoes", "casual"
	}

	return "shirt", "casual"
}