import { Elysia, t } from 'elysia';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { authMiddleware } from '../middlware/auth.middleware';

const databaseService = DatabaseService.getInstance();
const userRepository = new UserRepository(databaseService.db);

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(authMiddleware)
  
  .get('/profile', async ({ user, set }) => {
    try {
      const fullUser = await userRepository.findById(user.id);
      
      if (!fullUser) {
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
            id: fullUser.id,
            email: fullUser.email,
            name: fullUser.name,
            city: fullUser.city,
            gender: fullUser.gender,
            preferences: fullUser.preferences,
            createdAt: fullUser.createdAt,
            updatedAt: fullUser.updatedAt
          }
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch user profile'
      };
    }
  }, {
    detail: {
      tags: ['Users'],
      summary: 'Get user profile',
      description: 'Get authenticated user profile information'
    }
  })

  .put('/profile', async ({ user, body, set }) => {
    try {
      const { name, city, gender, preferences } = body;
      
      const updatedUser = await userRepository.update(user.id, {
        name,
        city,
        gender,
        preferences
      });

      if (!updatedUser) {
        set.status = 404;
        return {
          success: false,
          message: 'User not found'
        };
      }

      return {
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            city: updatedUser.city,
            gender: updatedUser.gender,
            preferences: updatedUser.preferences,
            updatedAt: updatedUser.updatedAt
          }
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update profile'
      };
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String({ minLength: 2 })),
      city: t.Optional(t.String()),
      gender: t.Optional(t.Union([
        t.Literal('male'),
        t.Literal('female'),
        t.Literal('other')
      ])),
      preferences: t.Optional(t.Object({
        style: t.Optional(t.Array(t.String())),
        colors: t.Optional(t.Array(t.String())),
        brands: t.Optional(t.Array(t.String())),
        priceRange: t.Optional(t.Object({
          min: t.Number(),
          max: t.Number()
        }))
      }))
    }),
    detail: {
      tags: ['Users'],
      summary: 'Update user profile',
      description: 'Update authenticated user profile information'
    }
  })

  .delete('/profile', async ({ user, set }) => {
    try {
      const deleted = await userRepository.delete(user.id);
      
      if (!deleted) {
        set.status = 404;
        return {
          success: false,
          message: 'User not found'
        };
      }

      return {
        success: true,
        message: 'User account deleted successfully'
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete user account'
      };
    }
  }, {
    detail: {
      tags: ['Users'],
      summary: 'Delete user account',
      description: 'Permanently delete authenticated user account'
    }
  });