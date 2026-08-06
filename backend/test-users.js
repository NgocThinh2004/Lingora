const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { AdminUsersService } = require('./dist/modules/users/admin/admin-users.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(AdminUsersService);
  const users = await service.findAll({ page: 1, limit: 10, search: '' });
  console.log(JSON.stringify(users, null, 2));
  await app.close();
}
bootstrap().catch(console.error);
