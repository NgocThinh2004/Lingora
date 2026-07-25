import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { User } from '../users/models/user.model';
import { Category } from '../categories/models/category.model';
import { CategoryTranslation } from '../categories/models/category-translation.model';
import { Post } from '../posts/models/post.model';
import { PostTranslation } from '../posts/models/post-translation.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User,
      Category,
      CategoryTranslation,
      Post,
      PostTranslation,
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
