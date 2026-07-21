import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { PostsModule } from './modules/posts/posts.module';
import { TranslationsModule } from './modules/translations/translations.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    PostsModule,
    UploadsModule,
    TranslationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
