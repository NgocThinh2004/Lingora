import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { LanguagesModule } from './modules/languages/languages.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { PostsModule } from './modules/posts/posts.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { CommentsModule } from './modules/comments/comments.module';
import { LikesModule } from './modules/likes/likes.module';
import { TranslationsModule } from './modules/translations/translations.module';
import { SearchModule } from './modules/search/search.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Kết nối Redis qua ioredis, địa chỉ đọc từ biến môi trường
        // Docker container redis-lingora đang expose port 6379 → 6379
        const redisUrl = `redis://${config.get('REDIS_HOST', '127.0.0.1')}:${config.get('REDIS_PORT', 6379)}`;
        return {
          stores: [
            new Keyv({
              store: new KeyvRedis(redisUrl),
              // TTL mặc định 5 phút (tính bằng ms) cho các cache dùng chung (không liên quan đến view)
              ttl: 300_000,
            }),
          ],
        };
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 60, // 60 requests per minute
    }]),
    DatabaseModule,
    UsersModule,
    AuthModule,
    LanguagesModule,
    CategoriesModule,
    PostsModule,
    UploadsModule,
    SubscriptionsModule,
    SearchModule,
    CommentsModule,
    LikesModule,
    TranslationsModule,
    DashboardModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule { }
