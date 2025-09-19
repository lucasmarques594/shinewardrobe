import { Recommendation } from '../entities/recommendation.entity';

export interface IRecommendationRepository {
  create(recommendationData: Omit<Recommendation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recommendation>;
  findById(id: string): Promise<Recommendation | null>;
  findByUserId(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      active?: boolean;
    }
  ): Promise<{
    recommendations: Recommendation[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  findByCity(city: string, limit?: number): Promise<Recommendation[]>;
  update(id: string, updates: Partial<Recommendation>): Promise<Recommendation | null>;
  delete(id: string): Promise<boolean>;
  getPopularProducts(
    gender?: 'male' | 'female' | 'other',
    limit?: number
  ): Promise<Array<{
    productId: string;
    name: string;
    category: string;
    count: number;
    avgPrice: number;
  }>>;
}