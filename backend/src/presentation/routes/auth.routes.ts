import { Elysia, t } from 'elysia';
import { AuthService } from '../../application/services/auth.service';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';

const databaseService = DatabaseService.getInstance();
const userRepository = new UserRepository(databaseService.db);
const authService = new AuthService(userRepository);

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/register', async ({ body, set, jwt }: { body: any, set: any, jwt: any }) => {
    try {
      const { email, password, name, city, gender } = body;
      
      const user = await authService.register({
        email,
        password,
        name,
        city,
        gender
      });

      const token = await jwt.sign({
        userId: user.id,
        email: user.email
      });

      set.status = 201;
      return {
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            city: user.city,
            gender: user.gender
          },
          token
        }
      };
    } catch (error) {
      set.status = 400;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 6 }),
      name: t.String({ minLength: 2 }),
      city: t.Optional(t.String()),
      gender: t.Optional(t.Union([
        t.Literal('male'),
        t.Literal('female'),
        t.Literal('other')
      ]))
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Register new user',
      description: 'Create a new user account'
    }
  })

  .post('/login', async ({ body, set, jwt }: { body: any, set: any, jwt: any }) => {
    try {
      const { email, password } = body;
      
      const user = await authService.login(email, password);

      const token = await jwt.sign({
        userId: user.id,
        email: user.email
      });

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            city: user.city,
            gender: user.gender
          },
          token
        }
      };
    } catch (error) {
      set.status = 401;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String()
    }),
    detail: {
      tags: ['Auth'],
      summary: 'User login',
      description: 'Authenticate user and get JWT token'
    }
  })

  .post('/refresh', async ({ headers, set, jwt }: { headers: Record<string, string | undefined>, set: any, jwt: any }) => {
    try {
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization header required'
        };
      }

      const token = authHeader.substring(7);
      const payload = await jwt.verify(token);

      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid token'
        };
      }

      const user = await userRepository.findById(payload.userId);
      if (!user) {
        set.status = 404;
        return {
          success: false,
          message: 'User not found'
        };
      }

      const newToken = await jwt.sign({
        userId: user.id,
        email: user.email
      });

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken
        }
      };
    } catch (error) {
      set.status = 401;
      return {
        success: false,
        message: 'Token refresh failed'
      };
    }
  }, {
    detail: {
      tags: ['Auth'],
      summary: 'Refresh JWT token',
      description: 'Get a new JWT token using current valid token'
    }
  })

  .get('/me', async ({ headers, set, jwt }: { headers: Record<string, string | undefined>, set: any, jwt: any }) => {
    try {
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization header required'
        };
      }

      const token = authHeader.substring(7);
      const payload = await jwt.verify(token);

      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid token'
        };
      }

      const user = await userRepository.findById(payload.userId);
      if (!user) {
        set.status = 404;
        return {
          success: false,
          message: 'User not found'
        };
      }

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            city: user.city,
            gender: user.gender,
            preferences: user.preferences,
            createdAt: user.createdAt
          }
        }
      };
    } catch (error) {
      set.status = 401;
      return {
        success: false,
        message: 'Authentication failed'
      };
    }
  }, {
    detail: {
      tags: ['Auth'],
      summary: 'Get current user info',
      description: 'Get authenticated user information'
    }
  });