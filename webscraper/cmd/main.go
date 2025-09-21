package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"shinewardrobe-scraper/internal/config"
	"shinewardrobe-scraper/internal/database"
	"shinewardrobe-scraper/internal/scheduler"
	"shinewardrobe-scraper/internal/scraper"

	"github.com/sirupsen/logrus"
)

func main() {
	logrus.SetFormatter(&logrus.JSONFormatter{})
	logrus.SetLevel(logrus.InfoLevel)

	logger := logrus.WithField("service", "shinewardrobe-scraper")
	logger.Info("Starting ShineWardrobe Scraper...")

	cfg, err := config.Load()
	if err != nil {
		logger.WithError(err).Fatal("Failed to load configuration")
	}

	db, err := database.NewConnection(cfg.DatabaseURL)
	if err != nil {
		logger.WithError(err).Fatal("Failed to connect to database")
	}
	defer db.Close()

	logger.Info("Database connected successfully")

	scraperService := scraper.NewService(db, logger)

	schedulerService := scheduler.NewService(scraperService, cfg.Schedule, logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	schedulerService.Start(ctx)

	logger.Info("Running initial scrape...")
	if err := scraperService.ScrapeAll(ctx); err != nil {
		logger.WithError(err).Error("Initial scrape failed")
	}

	logger.Info("Scraper started successfully. Waiting for scheduled runs...")

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	<-sigChan
	logger.Info("Received shutdown signal. Shutting down gracefully...")

	schedulerService.Stop()

	logger.Info("Scraper stopped successfully")
}