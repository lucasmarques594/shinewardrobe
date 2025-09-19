import { Elysia, t } from 'elysia';
import { WeatherService } from '../../application/services/weather.service';

const weatherService = new WeatherService();

export const weatherRoutes = new Elysia({ prefix: '/weather' })
  
  .get('/current/:city', async ({ params, set }) => {
    try {
      const { city } = params;
      
      if (!city) {
        set.status = 400;
        return {
          success: false,
          message: 'City parameter is required'
        };
      }

      const weather = await weatherService.getCurrentWeather(city);
      const recommendations = weatherService.getWeatherRecommendation(weather);

      return {
        success: true,
        data: {
          weather,
          recommendations
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch weather data'
      };
    }
  }, {
    params: t.Object({
      city: t.String()
    }),
    detail: {
      tags: ['Weather'],
      summary: 'Get current weather',
      description: 'Get current weather data and clothing recommendations for a city'
    }
  })

  .get('/forecast/:city', async ({ params, query, set }) => {
    try {
      const { city } = params;
      const { days = 5 } = query;
      
      if (!city) {
        set.status = 400;
        return {
          success: false,
          message: 'City parameter is required'
        };
      }

      const forecast = await weatherService.getForecast(city, Number(days));

      return {
        success: true,
        data: {
          city,
          forecast
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch weather forecast'
      };
    }
  }, {
    params: t.Object({
      city: t.String()
    }),
    query: t.Object({
      days: t.Optional(t.String())
    }),
    detail: {
      tags: ['Weather'],
      summary: 'Get weather forecast',
      description: 'Get weather forecast for specified number of days'
    }
  });