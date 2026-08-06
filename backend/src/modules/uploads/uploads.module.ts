import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { MediaAsset } from './models/media-asset.model';

@Module({
  imports: [SequelizeModule.forFeature([MediaAsset])],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
