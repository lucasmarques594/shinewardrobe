import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { bearer } from '@elysiajs/bearer';
import { cookie } from '@elysiajs/cookie';

import { authRoutes } from './presentation/routes/auth.routes';
import { userRoutes } from './presentation/routes/user.routes';
import { productRoutes } from './presentation/routes/product.routes';
import { weatherRoutes } from './presentation/routes/weather.routes';

import { DatabaseService } from './infrastructure/database/database.service';
import { errorHandler } from './presentation/middlware/error-handle';

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
          { name: 'Products', description: 'Produtos scraped' },
          { name: 'Weather', description: 'Dados meteorológicos' },
        ]
      }
    })
  )
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
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
    service: 'ShineWardrobe API',
    ollama: process.env.OLLAMA_URL || 'not configured'
  }), {
    detail: {
      tags: ['Health'],
      summary: 'Health check endpoint'
    }
  })

  .group('/api', (app) => 
    app
      .use(authRoutes)
      .use(userRoutes)
      .use(productRoutes)
      .use(weatherRoutes)
  )

  .listen(process.env.BACKEND_PORT || 8080);

console.log(`🦊 ShineWardrobe API is running at http://localhost:${app.server?.port}`);
console.log(`📚 Swagger documentation available at http://localhost:${app.server?.port}/swagger`);
console.log(`🤖 Ollama URL: ${process.env.OLLAMA_URL || 'not configured'}`);

// Test Ollama connection
if (process.env.OLLAMA_URL) {
  fetch(`${process.env.OLLAMA_URL}/api/tags`)
    .then(() => console.log('✅ Ollama connection successful'))
    .catch(() => console.log('⚠️  Ollama not available - will use fallback recommendations'));
}