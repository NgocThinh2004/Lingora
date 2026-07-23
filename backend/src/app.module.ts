import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    LanguagesModule,
    CategoriesModule,
    PostsModule,
    UploadsModule,
    SubscriptionsModule,
    CommentsModule,
    LikesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
