import { Elysia, t } from 'elysia';
import { RecommendationService } from '../../application/services/recommendation.service';
import { RecommendationRepository } from '../../infrastructure/repositories/recommendation.repository';
import { WeatherService } from '../../application/services/weather.service';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { authMiddleware } from '../middlware/auth.middleware';

const databaseService = DatabaseService.getInstance();
const recommendationRepository = new RecommendationRepository(databaseService.db);
const productRepository = new ProductRepository(databaseService.db);
const weatherService = new WeatherService();
const recommendationService = new RecommendationService(
  recommendationRepository,
  productRepository,
  weatherService
);

export const recommendationRoutes = new Elysia({ prefix: '/recommendations' })
  .use(authMiddleware)
  
  .post('/', async ({ body, user, set }) => {
    try {
      const { city, gender } = body;
      
      const recommendation = await recommendationService.generateRecommendation(
        user.id,
        city || user.city,
        gender || user.gender
      );

      set.status = 201;
      return {
        success: true,
        message: 'Recommendation generated successfully',
        data: recommendation
      };
    } catch (error) {
      set.status = 400;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate recommendation'
      };
    }
  }, {
    body: t.Object({
      city: t.Optional(t.String()),
      gender: t.Optional(t.Union([
        t.Literal('male'),
        t.Literal('female'),
        t.Literal('other')
      ]))
    }),
    detail: {
      tags: ['Recommendations'],
      summary: 'Generate outfit recommendation',
      description: 'Generate outfit recommendations based on weather and user preferences'
    }
  })

  .get('/', async ({ user, query, set }) => {
    try {
      const { page = 1, limit = 10, active } = query;
      
      const recommendations = await recommendationService.getUserRecommendations(
        user.id,
        {
          page: Number(page),
          limit: Number(limit),
          active: active ? active === 'true' : undefined
        }
      );

      return {
        success: true,
        data: recommendations
      };
    } catch (error) {
      set.status = 400;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch recommendations'
      };
    }
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      active: t.Optional(t.String())
    }),
    detail: {
      tags: ['Recommendations'],
      summary: 'Get user recommendations',
      description: 'Fetch paginated list of user recommendations'
    }
  })

  .get('/:id', async ({ params, user, set }) => {
    try {
      const recommendation = await recommendationService.getRecommendationById(
        params.id,
        user.id
      );

      if (!recommendation) {
        set.status = 404;
        return {
          success: false,
          message: 'Recommendation not found'
        };
      }

      return {
        success: true,
        data: recommendation
      };
    } catch (error) {
      set.status = 400;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch recommendation'
      };
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ['Recommendations'],
      summary: 'Get recommendation by ID',
      description: 'Fetch specific recommendation by ID'
    }
  })

  .put('/:id', async ({ params, user, body, set }) => {
    try {
      const recommendation = await recommendationService.updateRecommendation(
        params.id,
        user.id,
        body
      );

      if (!recommendation) {
        set.status = 404;
        return {
          success: false,
          message: 'Recommendation not found'
        };
      }

      return {
        success: true,
        message: 'Recommendation updated successfully',
        data: recommendation
      };
    } catch (error) {
      set.status = 400;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update recommendation'
      };
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      isActive: t.Optional(t.Boolean())
    }),
    detail: {
      tags: ['Recommendations'],
      summary: 'Update recommendation',
      description: 'Update recommendation properties'
    }
  })

  .delete('/:id', async ({ params, user, set }) => {
    try {
      const success = await recommendationService.deleteRecommendation(
        params.id,
        user.id
      );

      if (!success) {
        set.status = 404;
        return {
          success: false,
          message: 'Recommendation not found'
        };
      }

      return {
        success: true,
        message: 'Recommendation deleted successfully'
      };
    } catch (error) {
      set.status = 400;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete recommendation'
      };
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ['Recommendations'],
      summary: 'Delete recommendation',
      description: 'Delete specific recommendation'
    }
  })

  .post('/:id/regenerate', async ({ params, user, set }) => {
    try {
      const recommendation = await recommendationService.regenerateRecommendation(
        params.id,
        user.id
      );

      if (!recommendation) {
        set.status = 404;
        return {
          success: false,
          message: 'Recommendation not found'
        };
      }

      return {
        success: true,
        message: 'Recommendation regenerated successfully',
        data: recommendation
      };
    } catch (error) {
      set.status = 400;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to regenerate recommendation'
      };
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ['Recommendations'],
      summary: 'Regenerate recommendation',
      description: 'Generate new outfit recommendation for same conditions'
    }
  });

