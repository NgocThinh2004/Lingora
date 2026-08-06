const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { Subscription } = require('./dist/database/models');
const { fn, col } = require('sequelize');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const followerGroups = await Subscription.findAll({
    attributes: [
      'author_id',
      [fn('COUNT', col('id')), 'followerCount'],
    ],
    group: ['author_id'],
    order: [[fn('COUNT', col('id')), 'DESC'], ['author_id', 'ASC']],
    limit: 5,
    raw: true,
  });
  console.log(followerGroups);
  await app.close();
}
bootstrap().catch(console.error);
