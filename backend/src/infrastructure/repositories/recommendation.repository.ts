import { eq, desc, and, sql } from 'drizzle-orm';
import { recommendations } from '../database/schema';
import { Recommendation } from '../../domain/entities/recommendation.entity';
import { IRecommendationRepository } from '../../domain/repositories/recommendation.repository.interface';

export class RecommendationRepository implements IRecommendationRepository {
  constructor(private db: any) {}

  async create(recommendationData: Omit<Recommendation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recommendation> {
    const [recommendation] = await this.db
      .insert(recommendations)
      .values({
        ...recommendationData,
        weather: recommendationData.weather,
        outfit: recommendationData.outfit,
      })
      .returning();

    return this.mapToEntity(recommendation);
  }

  async findById(id: string): Promise<Recommendation | null> {
    const [recommendation] = await this.db
      .select()
      .from(recommendations)
      .where(eq(recommendations.id, id))
      .limit(1);

    return recommendation ? this.mapToEntity(recommendation) : null;
  }

  async findByUserId(
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
    const offset = (page - 1) * limit;

    const whereConditions = [eq(recommendations.userId, userId)];
    if (active !== undefined) {
      whereConditions.push(eq(recommendations.isActive, active));
    }

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(recommendations)
      .where(and(...whereConditions));

    const results = await this.db
      .select()
      .from(recommendations)
      .where(and(...whereConditions))
      .orderBy(desc(recommendations.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(count / limit);

    return {
      recommendations: results.map(this.mapToEntity),
      total: count,
      page,
      totalPages,
    };
  }

  async findByCity(city: string, limit: number = 10): Promise<Recommendation[]> {
    const results = await this.db
      .select()
      .from(recommendations)
      .where(eq(recommendations.city, city))
      .orderBy(desc(recommendations.createdAt))
      .limit(limit);

    return results.map(this.mapToEntity);
  }

  async update(id: string, updates: Partial<Recommendation>): Promise<Recommendation | null> {
    const [recommendation] = await this.db
      .update(recommendations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(recommendations.id, id))
      .returning();

    return recommendation ? this.mapToEntity(recommendation) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(recommendations)
      .where(eq(recommendations.id, id));

    return result.rowCount > 0;
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
    return [];
  }

  private mapToEntity(recommendation: any): Recommendation {
    return {
      id: recommendation.id,
      userId: recommendation.userId,
      city: recommendation.city,
      weather: recommendation.weather,
      outfit: recommendation.outfit,
      aiRecommendation: recommendation.aiRecommendation,
      isActive: recommendation.isActive,
      createdAt: recommendation.createdAt,
      updatedAt: recommendation.updatedAt,
    };
  }
}