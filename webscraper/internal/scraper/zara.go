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

type ZaraScraper struct {
	logger *logrus.Entry
}

func NewZaraScraper(logger *logrus.Entry) *ZaraScraper {
	return &ZaraScraper{
		logger: logger.WithField("scraper", "zara"),
	}
}

func (z *ZaraScraper) GetName() string {
	return "Zara"
}

func (z *ZaraScraper) ScrapeProducts(ctx context.Context) ([]Product, error) {
	z.logger.Info("Starting Zara scraping...")

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
		"camisetas-masculino": "https://www.zara.com/br/pt/homem/camisetas-c269234.html",
		"camisetas-feminino":  "https://www.zara.com/br/pt/mulher/camisetas-c269186.html",
		"calcas-masculino":    "https://www.zara.com/br/pt/homem/calcas-c358041.html",
		"calcas-feminino":     "https://www.zara.com/br/pt/mulher/calcas-c358040.html",
	}

	for categoryName, url := range categories {
		z.logger.WithField("category", categoryName).Info("Scraping category...")

		categoryProducts, err := z.scrapeCategory(chromeCtx, url, categoryName)
		if err != nil {
			z.logger.WithError(err).WithField("category", categoryName).Error("Failed to scrape category")
			continue
		}

		products = append(products, categoryProducts...)
		
		time.Sleep(2 * time.Second)
	}

	z.logger.WithField("total_products", len(products)).Info("Zara scraping completed")
	return products, nil
}

func (z *ZaraScraper) scrapeCategory(ctx context.Context, url, categoryName string) ([]Product, error) {
	var htmlContent string

	err := chromedp.Run(ctx,
		chromedp.Navigate(url),
		chromedp.Sleep(3*time.Second), 
		chromedp.WaitVisible(".product-item", chromedp.ByQuery),
		chromedp.InnerHTML("html", &htmlContent),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to load page: %w", err)
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(htmlContent))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	var products []Product

	doc.Find(".product-item").Each(func(i int, s *goquery.Selection) {
		if i >= 20 { 
			return
		}

		product := z.extractProduct(s, categoryName)
		if product.Name != "" && product.Price > 0 {
			products = append(products, product)
		}
	})

	return products, nil
}

func (z *ZaraScraper) extractProduct(s *goquery.Selection, categoryName string) Product {
	name := strings.TrimSpace(s.Find(".product-name, .product-title, h3").First().Text())
	priceText := strings.TrimSpace(s.Find(".price, .product-price").First().Text())
	imageURL, _ := s.Find("img").First().Attr("src")
	productURL, _ := s.Find("a").First().Attr("href")

	if imageURL != "" && !strings.HasPrefix(imageURL, "http") {
		imageURL = "https://static.zara.net" + imageURL
	}
	if productURL != "" && !strings.HasPrefix(productURL, "http") {
		productURL = "https://www.zara.com" + productURL
	}

	category, subcategory := z.categorizeProduct(categoryName, name)
	gender := determineGender(name, category)

	product := Product{
		Name:        name,
		Brand:       "Zara",
		Category:    category,
		Subcategory: subcategory,
		Price:       extractPrice(priceText),
		ImageURL:    imageURL,
		ProductURL:  productURL,
		Source:      "zara",
		Gender:      gender,
		Season:      "all",
		Weather:     determineWeatherSuitability(category, name),
		Sizes:       []string{"P", "M", "G", "GG"}, 
		Colors:      []string{"Variadas"},          
	}

	if originalPriceText := strings.TrimSpace(s.Find(".price-old, .original-price").First().Text()); originalPriceText != "" {
		originalPrice := extractPrice(originalPriceText)
		if originalPrice > product.Price {
			product.OriginalPrice = &originalPrice
		}
	}

	return product
}

func (z *ZaraScraper) categorizeProduct(categoryName, productName string) (string, string) {
	lowerName := strings.ToLower(productName)
	lowerCategory := strings.ToLower(categoryName)

	if strings.Contains(lowerCategory, "camiseta") || strings.Contains(lowerName, "camiseta") {
		return "shirt", "t-shirt"
	}
	if strings.Contains(lowerCategory, "calca") || strings.Contains(lowerName, "calça") {
		if strings.Contains(lowerName, "jeans") {
			return "pants", "jeans"
		}
		return "pants", "trousers"
	}
	if strings.Contains(lowerName, "vestido") {
		return "dress", "casual"
	}
	if strings.Contains(lowerName, "casaco") || strings.Contains(lowerName, "jaqueta") {
		return "jacket", "casual"
	}
	if strings.Contains(lowerName, "sapato") || strings.Contains(lowerName, "tênis") {
		return "shoes", "casual"
	}

	return "shirt", "casual"
}