const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { DashboardService } = require('./dist/modules/dashboard/dashboard.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(DashboardService);
  const overview = await service.getOverview();
  console.log(JSON.stringify(overview.social, null, 2));
  await app.close();
}
bootstrap().catch(console.error);
