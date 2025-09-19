import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { bearer } from '@elysiajs/bearer';
import { cookie } from '@elysiajs/cookie';

import { authRoutes } from './presentation/routes/auth.routes';
import { userRoutes } from './presentation/routes/user.routes';
import { recommendationRoutes } from './presentation/routes/recommendation.routes';
import { productRoutes } from './presentation/routes/product.routes';
import { weatherRoutes } from './presentation/routes/weather.routes';

import { DatabaseService } from './infrastructure/database/database.service';
import { errorHandler } from './presentation/middlware/error-handle';

// Initialize database
const databaseService = new DatabaseService();
await databaseService.initialize();

const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: 'ShineWardrobe API',
          version: '1.0.0',
          description: 'API para recomendações de roupas baseadas no clima',
        },
        servers: [
          {
            url: 'http://localhost:8080',
            description: 'Development server'
          }
        ],
        tags: [
          { name: 'Auth', description: 'Autenticação e autorização' },
          { name: 'Users', description: 'Gerenciamento de usuários' },
          { name: 'Recommendations', description: 'Recomendações de roupas' },
          { name: 'Products', description: 'Produtos scraped' },
          { name: 'Weather', description: 'Dados meteorológicos' },
        ]
      }
    })
  )
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    })
  )
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'fallback-secret-key'
    })
  )
  .use(bearer())
  .use(cookie())
  .onError(errorHandler)
  
  // Health check
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ShineWardrobe API'
  }), {
    detail: {
      tags: ['Health'],
      summary: 'Health check endpoint'
    }
  })

  // API Routes
  .group('/api', (app) => 
    app
      .use(authRoutes)
      .use(userRoutes)
      .use(recommendationRoutes)
      .use(productRoutes)
      .use(weatherRoutes)
  )

  .listen(process.env.BACKEND_PORT || 8080);

console.log(`🦊 ShineWardrobe API is running at http://localhost:${app.server?.port}`);
console.log(`📚 Swagger documentation available at http://localhost:${app.server?.port}/swagger`);