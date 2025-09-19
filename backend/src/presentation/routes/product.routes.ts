import { Elysia, t } from 'elysia';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';

const databaseService = DatabaseService.getInstance();
const productRepository = new ProductRepository(databaseService.db);

export const productRoutes = new Elysia({ prefix: '/products' })
  
  .get('/', async ({ query, set }) => {
    try {
      const {
        page = 1,
        limit = 20,
        gender,
        category,
        isLuxury,
        isEconomic,
        isAvailable = true
      } = query;

      const result = await productRepository.findAll({
        page: Number(page),
        limit: Number(limit),
        gender: gender as any,
        category,
        isLuxury: isLuxury === 'true',
        isEconomic: isEconomic === 'true',
        isAvailable: isAvailable === 'true'
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch products'
      };
    }
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      gender: t.Optional(t.Union([
        t.Literal('male'),
        t.Literal('female'),
        t.Literal('unisex')
      ])),
      category: t.Optional(t.String()),
      isLuxury: t.Optional(t.String()),
      isEconomic: t.Optional(t.String()),
      isAvailable: t.Optional(t.String())
    }),
    detail: {
      tags: ['Products'],
      summary: 'List products',
      description: 'Get paginated list of products with optional filters'
    }
  })

  .get('/search', async ({ query, set }) => {
    try {
      const { q, gender, category, minPrice, maxPrice, isLuxury, isEconomic } = query;
      
      if (!q) {
        set.status = 400;
        return {
          success: false,
          message: 'Search query is required'
        };
      }

      const products = await productRepository.search(q, {
        gender: gender as any,
        category,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        isLuxury: isLuxury === 'true',
        isEconomic: isEconomic === 'true'
      });

      return {
        success: true,
        data: {
          products,
          total: products.length
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }, {
    query: t.Object({
      q: t.String(),
      gender: t.Optional(t.Union([
        t.Literal('male'),
        t.Literal('female'),
        t.Literal('unisex')
      ])),
      category: t.Optional(t.String()),
      minPrice: t.Optional(t.String()),
      maxPrice: t.Optional(t.String()),
      isLuxury: t.Optional(t.String()),
      isEconomic: t.Optional(t.String())
    }),
    detail: {
      tags: ['Products'],
      summary: 'Search products',
      description: 'Search products by name, brand, or description with filters'
    }
  })

  .get('/categories', async ({ set }) => {
    try {
      const categories = await productRepository.getCategories();
      
      return {
        success: true,
        data: categories
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch categories'
      };
    }
  }, {
    detail: {
      tags: ['Products'],
      summary: 'Get product categories',
      description: 'Get list of available product categories'
    }
  })

  .get('/brands', async ({ set }) => {
    try {
      const brands = await productRepository.getBrands();
      
      return {
        success: true,
        data: brands
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch brands'
      };
    }
  }, {
    detail: {
      tags: ['Products'],
      summary: 'Get product brands',
      description: 'Get list of available product brands'
    }
  })

  .get('/:id', async ({ params, set }) => {
    try {
      const product = await productRepository.findById(params.id);
      
      if (!product) {
        set.status = 404;
        return {
          success: false,
          message: 'Product not found'
        };
      }

      return {
        success: true,
        data: product
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch product'
      };
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ['Products'],
      summary: 'Get product by ID',
      description: 'Get specific product details by ID'
    }
  });