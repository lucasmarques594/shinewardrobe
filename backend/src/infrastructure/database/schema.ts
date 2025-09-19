import { pgTable, varchar, timestamp, uuid, jsonb, decimal, boolean, text, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }),
  gender: varchar('gender', { length: 20 }), // 'male', 'female', 'other'
  preferences: jsonb('preferences').$type<{
    style?: string[];
    colors?: string[];
    brands?: string[];
    priceRange?: {
      min: number;
      max: number;
    };
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Products table (from webscraping)
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 500 }).notNull(),
  brand: varchar('brand', { length: 255 }),
  category: varchar('category', { length: 100 }).notNull(), // 'shirt', 'pants', 'dress', etc.
  subcategory: varchar('subcategory', { length: 100 }), // 't-shirt', 'jeans', 'blazer', etc.
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('BRL').notNull(),
  imageUrl: text('image_url'),
  productUrl: text('product_url').notNull(),
  description: text('description'),
  sizes: jsonb('sizes').$type<string[]>(), // ['P', 'M', 'G', 'GG']
  colors: jsonb('colors').$type<string[]>(), // ['black', 'white', 'blue']
  isLuxury: boolean('is_luxury').default(false).notNull(),
  isEconomic: boolean('is_economic').default(false).notNull(),
  isAvailable: boolean('is_available').default(true).notNull(),
  source: varchar('source', { length: 100 }).notNull(), // website source
  gender: varchar('gender', { length: 20 }).notNull(), // 'male', 'female', 'unisex'
  season: varchar('season', { length: 20 }), // 'summer', 'winter', 'spring', 'autumn'
  weather: jsonb('weather').$type<string[]>(), // ['hot', 'cold', 'rain', 'sunny']
  scrapedAt: timestamp('scraped_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Recommendations table
export const recommendations = pgTable('recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  weather: jsonb('weather').$type<{
    temperature: number;
    condition: string; // 'sunny', 'cloudy', 'rainy', etc.
    humidity: number;
    windSpeed: number;
    description: string;
  }>().notNull(),
  outfit: jsonb('outfit').$type<{
    economic: Array<{
      productId: string;
      category: string;
      name: string;
      price: number;
      imageUrl?: string;
      productUrl: string;
    }>;
    luxury: Array<{
      productId: string;
      category: string;
      name: string;
      price: number;
      imageUrl?: string;
      productUrl: string;
    }>;
  }>().notNull(),
  aiRecommendation: text('ai_recommendation'), // Claude's reasoning
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Weather cache table
export const weatherCache = pgTable('weather_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  city: varchar('city', { length: 100 }).notNull(),
  data: jsonb('data').$type<{
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    description: string;
    icon: string;
  }>().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User saved outfits table
export const savedOutfits = pgTable('saved_outfits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  outfit: jsonb('outfit').$type<Array<{
    productId: string;
    category: string;
    name: string;
    price: number;
    imageUrl?: string;
    productUrl: string;
  }>>().notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Product price history for tracking
export const productPriceHistory = pgTable('product_price_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  isAvailable: boolean('is_available').notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  recommendations: many(recommendations),
  savedOutfits: many(savedOutfits),
}));

export const productsRelations = relations(products, ({ many }) => ({
  priceHistory: many(productPriceHistory),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  user: one(users, {
    fields: [recommendations.userId],
    references: [users.id],
  }),
}));

export const savedOutfitsRelations = relations(savedOutfits, ({ one }) => ({
  user: one(users, {
    fields: [savedOutfits.userId],
    references: [users.id],
  }),
}));

export const productPriceHistoryRelations = relations(productPriceHistory, ({ one }) => ({
  product: one(products, {
    fields: [productPriceHistory.productId],
    references: [products.id],
  }),
}));