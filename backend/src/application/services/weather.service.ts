import axios from 'axios';

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
}

export class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('WEATHER_API_KEY not set - using mock weather data');
    }
  }

  async getCurrentWeather(city: string): Promise<WeatherData> {
    if (!this.apiKey) {
      return this.getMockWeatherData(city);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: city,
          appid: this.apiKey,
          units: 'metric',
          lang: 'pt_br'
        }
      });

      const data = response.data;

      return {
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].main,
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        description: data.weather[0].description,
        icon: data.weather[0].icon
      };
    } catch (error) {
      console.error('Weather API error:', error);
      return this.getMockWeatherData(city);
    }
  }

  async getForecast(city: string, days: number = 5): Promise<WeatherData[]> {
    if (!this.apiKey) {
      return this.getMockForecastData(city, days);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          q: city,
          appid: this.apiKey,
          units: 'metric',
          lang: 'pt_br'
        }
      });

      const data = response.data;
      const forecast: WeatherData[] = [];

      // Get one forecast per day (around noon)
      for (let i = 0; i < Math.min(days, data.list.length); i += 8) {
        const item = data.list[i];
        forecast.push({
          temperature: Math.round(item.main.temp),
          condition: item.weather[0].main,
          humidity: item.main.humidity,
          windSpeed: Math.round(item.wind.speed * 3.6),
          description: item.weather[0].description,
          icon: item.weather[0].icon
        });
      }

      return forecast;
    } catch (error) {
      console.error('Forecast API error:', error);
      return this.getMockForecastData(city, days);
    }
  }

  private getMockWeatherData(city: string): WeatherData {
    // Mock data based on common Brazilian cities
    const mockData: Record<string, WeatherData> = {
      'São Paulo': {
        temperature: 22,
        condition: 'Clouds',
        humidity: 65,
        windSpeed: 15,
        description: 'nublado',
        icon: '02d'
      },
      'Rio de Janeiro': {
        temperature: 28,
        condition: 'Clear',
        humidity: 70,
        windSpeed: 12,
        description: 'céu limpo',
        icon: '01d'
      },
      'Brasília': {
        temperature: 25,
        condition: 'Clear',
        humidity: 45,
        windSpeed: 8,
        description: 'céu limpo',
        icon: '01d'
      }
    };

    return mockData[city] || {
      temperature: 24,
      condition: 'Clear',
      humidity: 60,
      windSpeed: 10,
      description: 'tempo bom',
      icon: '01d'
    };
  }

  private getMockForecastData(city: string, days: number): WeatherData[] {
    const baseWeather = this.getMockWeatherData(city);
    const forecast: WeatherData[] = [];

    for (let i = 0; i < days; i++) {
      forecast.push({
        ...baseWeather,
        temperature: baseWeather.temperature + Math.floor(Math.random() * 6) - 3,
        humidity: Math.max(30, Math.min(90, baseWeather.humidity + Math.floor(Math.random() * 20) - 10))
      });
    }

    return forecast;
  }

  getWeatherRecommendation(weather: WeatherData): {
    clothing: string[];
    accessories: string[];
    tips: string[];
  } {
    const recommendations = {
      clothing: [] as string[],
      accessories: [] as string[],
      tips: [] as string[]
    };

    // Temperature-based recommendations
    if (weather.temperature > 30) {
      recommendations.clothing.push('roupas leves', 'tecidos respiráveis', 'cores claras');
      recommendations.accessories.push('chapéu', 'óculos de sol');
      recommendations.tips.push('Use protetor solar', 'Mantenha-se hidratado');
    } else if (weather.temperature > 20) {
      recommendations.clothing.push('roupas frescas', 'camadas removíveis');
      recommendations.accessories.push('óculos de sol');
    } else if (weather.temperature > 10) {
      recommendations.clothing.push('casaco leve', 'calça comprida');
    } else {
      recommendations.clothing.push('casaco pesado', 'roupas quentes', 'camadas');
      recommendations.accessories.push('gorro', 'luvas', 'cachecol');
    }

    // Condition-based recommendations
    if (weather.condition.toLowerCase().includes('rain')) {
      recommendations.accessories.push('guarda-chuva', 'capa de chuva');
      recommendations.tips.push('Use sapatos impermeáveis');
    }

    if (weather.windSpeed > 20) {
      recommendations.tips.push('Evite roupas muito soltas pelo vento');
    }

    if (weather.humidity > 80) {
      recommendations.tips.push('Prefira tecidos que não retenham suor');
    }

    return recommendations;
  }
}