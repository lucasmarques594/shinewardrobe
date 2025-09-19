import { eq } from 'drizzle-orm';
import { users } from '../database/schema';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';

export class UserRepository implements IUserRepository {
  constructor(private db: any) {}

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({
        ...userData,
        passwordHash: userData.passwordHash,
      })
      .returning();

    return this.mapToEntity(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ? this.mapToEntity(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ? this.mapToEntity(user) : null;
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    const [user] = await this.db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return user ? this.mapToEntity(user) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id));

    return result.rowCount > 0;
  }

  private mapToEntity(user: any): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      city: user.city,
      gender: user.gender,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}