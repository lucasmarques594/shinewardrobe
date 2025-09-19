import { RecommendationRepository } from '../../infrastructure/repositories/recommendation.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { WeatherService } from './weather.service';
import { ClaudeService } from './claude.service';
import { Recommendation } from '../../domain/entities/recommendation.entity';

export class RecommendationService {
  constructor(
    private recommendationRepository: RecommendationRepository,
    private productRepository: ProductRepository,
    private weatherService: WeatherService,
    private claudeService: ClaudeService
  ) {}

  async generateRecommendation(
    userId: string,
    city?: string | null,
    gender?: 'male' | 'female' | 'other' | null
  ): Promise<Recommendation> {
    if (!city) {
      throw new Error('City is required for weather-based recommendations');
    }

    if (!gender) {
      throw new Error('Gender is required for outfit recommendations');
    }

    // Get current weather
    const weather = await this.weatherService.getCurrentWeather(city);

    // Get available products for the gender
    const products = await this.productRepository.findByGenderAndAvailability(
      gender === 'other' ? 'unisex' : gender,
      true // only available products
    );

    if (products.length === 0) {
      throw new Error('No products available for recommendations');
    }

    // Generate outfit using Claude AI
    const { outfit, reasoning } = await this.claudeService.generateOutfitRecommendation(
      weather,
      city,
      gender,
      products.map(product => ({
        ...product,
        imageUrl: product.imageUrl || undefined
      }))
    );

    // Save recommendation
    const recommendation = await this.recommendationRepository.create({
      userId,
      city,
      weather,
      outfit,
      aiRecommendation: reasoning,
      isActive: true
    });

    return recommendation;
  }

  async getUserRecommendations(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      active?: boolean;
    } = {}
  ): Promise<{
    recommendations: Recommendation[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, active } = options;
    
    return await this.recommendationRepository.findByUserId(userId, {
      page,
      limit,
      active
    });
  }

  async getRecommendationById(
    id: string,
    userId: string
  ): Promise<Recommendation | null> {
    const recommendation = await this.recommendationRepository.findById(id);
    
    if (!recommendation || recommendation.userId !== userId) {
      return null;
    }

    return recommendation;
  }

  async updateRecommendation(
    id: string,
    userId: string,
    updates: Partial<Pick<Recommendation, 'isActive'>>
  ): Promise<Recommendation | null> {
    const existing = await this.getRecommendationById(id, userId);
    if (!existing) {
      return null;
    }

    return await this.recommendationRepository.update(id, updates);
  }

  async deleteRecommendation(
    id: string,
    userId: string
  ): Promise<boolean> {
    const existing = await this.getRecommendationById(id, userId);
    if (!existing) {
      return false;
    }

    return await this.recommendationRepository.delete(id);
  }

  async regenerateRecommendation(
    id: string,
    userId: string
  ): Promise<Recommendation | null> {
    const existing = await this.getRecommendationById(id, userId);
    if (!existing) {
      return null;
    }

    // Generate new recommendation with same parameters
    return await this.generateRecommendation(
      userId,
      existing.city,
      this.extractGenderFromRecommendation(existing)
    );
  }

  async getRecommendationsByCity(
    city: string,
    limit: number = 10
  ): Promise<Recommendation[]> {
    return await this.recommendationRepository.findByCity(city, limit);
  }

  async getPopularProducts(
    gender?: 'male' | 'female' | 'other',
    limit: number = 20
  ): Promise<Array<{
    productId: string;
    name: string;
    category: string;
    count: number;
    avgPrice: number;
  }>> {
    return await this.recommendationRepository.getPopularProducts(gender, limit);
  }

  private extractGenderFromRecommendation(recommendation: Recommendation): 'male' | 'female' | 'other' {
    return 'other'; // fallback
  }
}