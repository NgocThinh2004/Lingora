import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1').replace(/^\/+|\/+$/g, '');
  const frontendOrigins = configService
    .get<string>('FRONTEND_URL', 'http://localhost:4200')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());

  // Global Pipes, Filters, Interceptors
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Lingora API')
    .setDescription('The Lingora API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  // await app.listen(process.env.PORT ?? 3000, '0.0.0.0'); 
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
