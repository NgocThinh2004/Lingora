import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { TranslationsModule } from '../translations/translations.module';
import { Category } from '../categories/models/category.model';
import { CategoryTranslation } from '../categories/models/category-translation.model';
import { AdminLanguagesController } from './admin/admin-languages.controller';
import { PublicLanguagesController } from './public/public-languages.controller';
import { PublicLocalesController } from './public/public-locales.controller';
import { LanguagesService } from './languages.service';
import { Language } from './models/language.model';
import { LocaleBundlesService } from './locale-bundles.service';

@Module({
  imports: [
    UsersModule,
    TranslationsModule,
    SequelizeModule.forFeature([Language, Category, CategoryTranslation]),
  ],
  controllers: [PublicLanguagesController, PublicLocalesController, AdminLanguagesController],
  providers: [LanguagesService, LocaleBundlesService, RolesGuard],
  exports: [LanguagesService, LocaleBundlesService],
})
export class LanguagesModule {}
