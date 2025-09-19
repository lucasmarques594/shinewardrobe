import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';

const databaseService = DatabaseService.getInstance();
const userRepository = new UserRepository(databaseService.db);

export const authMiddleware = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'fallback-secret-key'
    })
  )
  .derive(async ({ headers, jwt, set }) => {
    const authHeader = headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401;
      throw new Error('Authorization header required');
    }

    const token = authHeader.substring(7);
    
    try {
      const payload = await jwt.verify(token);
      
      if (!payload || !payload.userId) {
        set.status = 401;
        throw new Error('Invalid token');
      }

      const user = await userRepository.findById(payload.userId.toString());
      
      if (!user) {
        set.status = 401;
        throw new Error('User not found');
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          city: user.city,
          gender: user.gender,
          preferences: user.preferences
        }
      };
    } catch (error) {
      set.status = 401;
      throw new Error('Invalid token');
    }
  });