import { Product, ProductSearchFilters } from '../entities/product.entity';

export interface IProductRepository {
  create(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findByGenderAndAvailability(
    gender: 'male' | 'female' | 'unisex',
    isAvailable?: boolean
  ): Promise<Product[]>;
  findAll(options?: {
    page?: number;
    limit?: number;
    gender?: 'male' | 'female' | 'unisex';
    category?: string;
    isLuxury?: boolean;
    isEconomic?: boolean;
    isAvailable?: boolean;
  }): Promise<{
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  search(query: string, filters?: ProductSearchFilters): Promise<Product[]>;
  update(id: string, updates: Partial<Product>): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
  getCategories(): Promise<string[]>;
  getBrands(): Promise<string[]>;
  markAsUnavailable(productIds: string[]): Promise<void>;
}