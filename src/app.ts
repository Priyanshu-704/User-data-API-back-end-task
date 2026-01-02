import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { requestLogger } from './middlewares/logger';
import { notFoundHandler } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';
import userRoutes from './routes/userRoutes';
import cacheRoutes from './routes/cacheRoutes';
import { rateLimitMiddleware } from './middlewares/rateLimit';

export function createApp(): Application {
  const app = express();
  app.use(helmet());
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With'
      ],
      credentials: true,
      maxAge: 86400
    })
  );

  app.use(requestLogger);
  app.use(compression());

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));


  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      features: {
        caching: {
          enabled: true,
          ttl: '60 seconds',
          strategy: 'LRU with concurrent handling'
        },
        rate_limiting: {
          enabled: true,
          limit: '10 requests/minute',
          burst: '5 requests / 10s'
        }
      }
    });
  });

  app.use('/api', rateLimitMiddleware);

  app.use('/api/users', userRoutes);
  app.use('/api/cache', cacheRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export function startServer(port: number | string = 3000): Application {
  const app = createApp();

  app.listen(port, () => {
    
    console.log(`Health: http://localhost:${port}/health`);
    console.log(`Users API: http://localhost:${port}/api/users`);
    console.log(`Cache API: http://localhost:${port}/api/cache`);
  });

  return app;
}
