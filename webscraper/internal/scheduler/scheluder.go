package scheduler

import (
	"context"

	"shinewardrobe-scraper/internal/scraper"

	"time"

	"github.com/go-co-op/gocron"
	"github.com/sirupsen/logrus"
)

type Service struct {
	scraper  *scraper.Service
	schedule string
	logger   *logrus.Entry
	cron     *gocron.Scheduler
}

func NewService(scraperService *scraper.Service, schedule string, logger *logrus.Entry) *Service {
	return &Service{
		scraper:  scraperService,
		schedule: schedule,
		logger:   logger.WithField("component", "scheduler"),
		cron:     gocron.NewScheduler(time.UTC),
	}
}

func (s *Service) Start(ctx context.Context) {
	s.logger.WithField("schedule", s.schedule).Info("Starting scheduler...")
	cronFields := parseCronSchedule(s.schedule)
	
	_, err := s.cron.Cron(cronFields).Do(func() {
		s.logger.Info("Executing scheduled scraping job...")
		
		jobCtx, cancel := context.WithTimeout(ctx, 30*time.Minute)
		defer cancel()
		
		if err := s.scraper.ScrapeAll(jobCtx); err != nil {
			s.logger.WithError(err).Error("Scheduled scraping job failed")
		} else {
			s.logger.Info("Scheduled scraping job completed successfully")
		}
	})

	if err != nil {
		s.logger.WithError(err).Fatal("Failed to schedule scraping job")
	}

	s.cron.StartAsync()
	s.logger.Info("Scheduler started successfully")
}

func (s *Service) Stop() {
	s.logger.Info("Stopping scheduler...")
	s.cron.Stop()
	s.logger.Info("Scheduler stopped")
}

func parseCronSchedule(schedule string) string {
	defaultSchedule := "59 23 * * *" 

	fields := []rune(schedule)
	if len(fields) < 10 {
		return defaultSchedule
	}
	
	firstSpace := -1
	for i, char := range fields {
		if char == ' ' {
			firstSpace = i
			break
		}
	}
	
	if firstSpace == -1 {
		return defaultSchedule
	}
	
	return string(fields[firstSpace+1:])
}