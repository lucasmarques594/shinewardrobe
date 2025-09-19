export interface Product {
  id: string;
  name: string;
  brand?: string | null;
  category: string;
  subcategory?: string | null;
  price: number;
  originalPrice?: number;
  currency: string;
  imageUrl?: string | null;
  productUrl: string;
  description?: string | null;
  sizes: string[];
  colors: string[];
  isLuxury: boolean;
  isEconomic: boolean;
  isAvailable: boolean;
  source: string;
  gender: 'male' | 'female' | 'unisex';
  season?: string | null;
  weather: string[];
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDTO {
  name: string;
  brand?: string;
  category: string;
  subcategory?: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  imageUrl?: string;
  productUrl: string;
  description?: string;
  sizes?: string[];
  colors?: string[];
  isLuxury?: boolean;
  isEconomic?: boolean;
  source: string;
  gender: 'male' | 'female' | 'unisex';
  season?: string;
  weather?: string[];
}

export interface UpdateProductDTO {
  name?: string;
  brand?: string;
  price?: number;
  originalPrice?: number;
  imageUrl?: string;
  description?: string;
  sizes?: string[];
  colors?: string[];
  isAvailable?: boolean;
  isLuxury?: boolean;
  isEconomic?: boolean;
}

export interface ProductSearchFilters {
  gender?: 'male' | 'female' | 'unisex';
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  isLuxury?: boolean;
  isEconomic?: boolean;
  brand?: string;
  source?: string;
}