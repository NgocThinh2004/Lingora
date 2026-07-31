import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Language, Post, PostTranslation } from '../../database/models';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { TranslationProviderService } from './translation-provider.service';
import { TranslationMetricsService } from './translation-metrics.service';
import { TranslationsController } from './translations.controller';
import { TranslationsService } from './translations.service';

@Module({
  imports: [
    UsersModule,
    SequelizeModule.forFeature([Post, PostTranslation, Language]),
  ],
  controllers: [TranslationsController],
  providers: [TranslationsService, TranslationProviderService, TranslationMetricsService, RolesGuard],
  exports: [TranslationsService, TranslationProviderService, TranslationMetricsService],
})
export class TranslationsModule {}
