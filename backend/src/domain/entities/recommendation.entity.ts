export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  description: string;
}

export interface OutfitItem {
  productId: string;
  category: string;
  name: string;
  price: number;
  imageUrl?: string;
  productUrl: string;
}

export interface Outfit {
  economic: OutfitItem[];
  luxury: OutfitItem[];
}

export interface Recommendation {
  id: string;
  userId: string;
  city: string;
  weather: WeatherData;
  outfit: Outfit;
  aiRecommendation?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecommendationDTO {
  userId: string;
  city: string;
  weather: WeatherData;
  outfit: Outfit;
  aiRecommendation?: string;
  isActive?: boolean;
}

export interface UpdateRecommendationDTO {
  isActive?: boolean;
  aiRecommendation?: string;
}