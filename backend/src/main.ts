import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1').replace(/^\/+|\/+$/g, '');
  const frontendOrigins = configService
    .get<string>('FRONTEND_URL', 'http://localhost:4200')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const uploadDirectory = configService.get<string>('UPLOAD_DIR', 'storage/uploads');

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.useStaticAssets(join(process.cwd(), uploadDirectory), {
    prefix: '/uploads/',
  });
  
  // Global Pipes, Filters, Interceptors
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
