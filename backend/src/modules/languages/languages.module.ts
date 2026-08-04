import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { TranslationsModule } from '../translations/translations.module';
import { AdminLanguagesController } from './admin/admin-languages.controller';
import { PublicLanguagesController } from './public/public-languages.controller';
import { LanguagesService } from './languages.service';
import { Language } from './models/language.model';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    UsersModule,
    TranslationsModule,
    CategoriesModule,
    SequelizeModule.forFeature([Language]),
  ],
  controllers: [PublicLanguagesController, AdminLanguagesController],
  providers: [LanguagesService, RolesGuard],
  exports: [LanguagesService],
})
export class LanguagesModule {}
