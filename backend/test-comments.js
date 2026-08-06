const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { Comment } = require('./dist/database/models');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const commentsWithoutAuthor = await Comment.findAll({
    include: [{ association: 'author', required: false }]
  });
  
  let nullAuthors = 0;
  for (const c of commentsWithoutAuthor) {
    if (!c.author) nullAuthors++;
  }
  console.log('Comments with null author:', nullAuthors);
  
  await app.close();
}
bootstrap().catch(console.error);
