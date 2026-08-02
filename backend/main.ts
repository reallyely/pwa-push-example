import 'reflect-metadata';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist', 'frontend', 'browser');
  app.useStaticAssets(frontendDist);

  // SPA fallback for Angular client-side routes (refresh/deep-link). Registered as
  // middleware (not a route) so it can explicitly defer /api/* to Nest's controllers
  // via next() — Nest installs its own terminal 404 handler at the end of app.init(),
  // after all controllers but registered unconditionally for any unmatched path, so a
  // route added after app.init()/app.listen() would run after that handler and never
  // be reached (verified empirically). Deferring by path prefix here sidesteps that.
  const spaFallback = (
    req: import('express').Request,
    res: import('express').Response,
    next: () => void,
  ): void => {
    if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  };
  // Cast needed: NestExpressApplication#getHttpAdapter() types req/res against the
  // ambient (structurally empty) Express.Request/Express.Response globals rather than
  // the feature-complete types the 'express' module itself exports (a known typing gap
  // between @nestjs/platform-express and @types/express v5), so the real Request/
  // Response types above don't structurally satisfy that signature.
  app.getHttpAdapter().use(spaFallback as (req: unknown, res: unknown, next: unknown) => void);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server listening on http://localhost:${port}`);
}

bootstrap();
