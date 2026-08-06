import {
  Body,
  Controller,
  Delete,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  MAX_EDITOR_AUDIO_BYTES,
  MAX_EDITOR_IMAGE_BYTES,
  MAX_EDITOR_MEDIA_BYTES,
  MAX_EDITOR_VIDEO_BYTES,
} from './uploads.constants';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Delete('editor-media')
  async deleteEditorMedia(
    @CurrentUser('id') userId: string,
    @Body() body: { url: string },
  ) {
    return this.uploadsService.deleteEditorMedia(userId, body.url);
  }

  @Post('import-external')
  async importExternalImage(
    @CurrentUser('id') userId: string,
    @Body() body: { url: string },
  ) {
    return this.uploadsService.importExternalImage(userId, body.url);
  }

  @Post('editor-image')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_EDITOR_IMAGE_BYTES,
      },
    }),
  )
  async uploadEditorImage(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.uploadsService.saveEditorImage(userId, this.getFirstFile(files));
  }

  @Post('avatar')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_EDITOR_IMAGE_BYTES,
      },
    }),
  )
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.uploadsService.saveAvatarImage(userId, this.getFirstFile(files));
  }

  @Post('editor-audio')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_EDITOR_AUDIO_BYTES,
      },
    }),
  )
  async uploadEditorAudio(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.uploadsService.saveEditorMedia(userId, this.getFirstFile(files), ['audio']);
  }

  @Post('editor-video')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_EDITOR_VIDEO_BYTES,
      },
    }),
  )
  async uploadEditorVideo(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.uploadsService.saveEditorMedia(userId, this.getFirstFile(files), ['video']);
  }

  @Post('editor-media')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_EDITOR_MEDIA_BYTES,
      },
    }),
  )
  async uploadEditorMedia(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.uploadsService.saveEditorMedia(userId, this.getFirstFile(files));
  }

  private getFirstFile(files: Express.Multer.File[] | undefined): Express.Multer.File | undefined {
    return files?.[0];
  }
}
