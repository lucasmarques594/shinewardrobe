import { eq, and, desc, sql, like, or } from 'drizzle-orm';
import { products } from '../database/schema';
import { Product } from '../../domain/entities/product.entity';
import { IProductRepository } from '../../domain/repositories/product.entity.interface';

export class ProductRepository implements IProductRepository {
  constructor(private db: any) {}

  async create(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const [product] = await this.db
      .insert(products)
      .values({
        ...productData,
        sizes: productData.sizes,
        colors: productData.colors,
        weather: productData.weather,
      })
      .returning();

    return this.mapToEntity(product);
  }

  async findById(id: string): Promise<Product | null> {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    return product ? this.mapToEntity(product) : null;
  }

  async findByGenderAndAvailability(
    gender: 'male' | 'female' | 'unisex',
    isAvailable: boolean = true
  ): Promise<Product[]> {
    const whereConditions = [eq(products.isAvailable, isAvailable)];
    
    if (gender !== 'unisex') {
      whereConditions.push(or(
        eq(products.gender, gender),
        eq(products.gender, 'unisex')
      )!);
    }

    const results = await this.db
      .select()
      .from(products)
      .where(and(...whereConditions))
      .orderBy(desc(products.scrapedAt));

    return results.map(this.mapToEntity);
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    gender?: 'male' | 'female' | 'unisex';
    category?: string;
    isLuxury?: boolean;
    isEconomic?: boolean;
    isAvailable?: boolean;
  } = {}): Promise<{
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      gender,
      category,
      isLuxury,
      isEconomic,
      isAvailable = true
    } = options;
    
    const offset = (page - 1) * limit;

    const whereConditions = [eq(products.isAvailable, isAvailable)];
    
    if (gender) {
      whereConditions.push(or(
        eq(products.gender, gender),
        eq(products.gender, 'unisex')
      )!);
    }
    
    if (category) {
      whereConditions.push(eq(products.category, category));
    }
    
    if (isLuxury !== undefined) {
      whereConditions.push(eq(products.isLuxury, isLuxury));
    }
    
    if (isEconomic !== undefined) {
      whereConditions.push(eq(products.isEconomic, isEconomic));
    }

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...whereConditions));

    const results = await this.db
      .select()
      .from(products)
      .where(and(...whereConditions))
      .orderBy(desc(products.scrapedAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(count / limit);

    return {
      products: results.map(this.mapToEntity),
      total: count,
      page,
      totalPages,
    };
  }

  async search(
    query: string,
    filters: {
      gender?: 'male' | 'female' | 'unisex';
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      isLuxury?: boolean;
      isEconomic?: boolean;
    } = {}
  ): Promise<Product[]> {
    const {
      gender,
      category,
      minPrice,
      maxPrice,
      isLuxury,
      isEconomic
    } = filters;

    const whereConditions = [
      eq(products.isAvailable, true),
      or(
        like(products.name, `%${query}%`),
        like(products.brand, `%${query}%`),
        like(products.description, `%${query}%`)
      )!
    ];

    if (gender) {
      whereConditions.push(or(
        eq(products.gender, gender),
        eq(products.gender, 'unisex')
      )!);
    }

    if (category) {
      whereConditions.push(eq(products.category, category));
    }

    if (minPrice !== undefined) {
      whereConditions.push(sql`${products.price} >= ${minPrice}`);
    }

    if (maxPrice !== undefined) {
      whereConditions.push(sql`${products.price} <= ${maxPrice}`);
    }

    if (isLuxury !== undefined) {
      whereConditions.push(eq(products.isLuxury, isLuxury));
    }

    if (isEconomic !== undefined) {
      whereConditions.push(eq(products.isEconomic, isEconomic));
    }

    const results = await this.db
      .select()
      .from(products)
      .where(and(...whereConditions))
      .orderBy(desc(products.scrapedAt))
      .limit(50); // Limit search results

    return results.map(this.mapToEntity);
  }

  async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    const [product] = await this.db
      .update(products)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    return product ? this.mapToEntity(product) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(products)
      .where(eq(products.id, id));

    return result.rowCount > 0;
  }

  async getCategories(): Promise<string[]> {
    const results = await this.db
      .selectDistinct({ category: products.category })
      .from(products)
      .where(eq(products.isAvailable, true));

    return results.map(r => r.category);
  }

  async getBrands(): Promise<string[]> {
    const results = await this.db
      .selectDistinct({ brand: products.brand })
      .from(products)
      .where(and(
        eq(products.isAvailable, true),
        sql`${products.brand} IS NOT NULL`
      ));

    return results.map(r => r.brand).filter(Boolean);
  }

  async markAsUnavailable(productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;

    await this.db
      .update(products)
      .set({ isAvailable: false, updatedAt: new Date() })
      .where(sql`${products.id} = ANY(${productIds})`);
  }

  private mapToEntity(product: any): Product {
    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory,
      price: parseFloat(product.price),
      originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : undefined,
      currency: product.currency,
      imageUrl: product.imageUrl,
      productUrl: product.productUrl,
      description: product.description,
      sizes: product.sizes || [],
      colors: product.colors || [],
      isLuxury: product.isLuxury,
      isEconomic: product.isEconomic,
      isAvailable: product.isAvailable,
      source: product.source,
      gender: product.gender,
      season: product.season,
      weather: product.weather || [],
      scrapedAt: product.scrapedAt,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}