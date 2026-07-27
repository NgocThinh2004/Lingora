import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { Comment } from './models/comment.model';
import { User } from '../users/models/user.model';
import { Post } from '../posts/models/post.model';
import { Language } from '../languages/models/language.model';
import { CommentTranslation } from './models/comment-translation.model';
import { CommentLike } from '../likes/models/comment-like.model';
import { TranslationsModule } from '../translations/translations.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Comment, User, Post, Language, CommentTranslation, CommentLike]),
    TranslationsModule
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
