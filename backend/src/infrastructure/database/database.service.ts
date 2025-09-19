import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

export class DatabaseService {
  private static instance: DatabaseService;
  public db: ReturnType<typeof drizzle<typeof schema>>;
  private client: ReturnType<typeof postgres>;

  constructor() {
    if (DatabaseService.instance) {
      return DatabaseService.instance;
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.client = postgres(connectionString, {
      max: 20,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    this.db = drizzle(this.client, { schema });
    DatabaseService.instance = this;
  }

  public async initialize(): Promise<void> {
    try {
      // Test connection
      await this.client`SELECT 1 as test`;
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    await this.client.end();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
}