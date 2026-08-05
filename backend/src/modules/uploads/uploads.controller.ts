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

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Delete('editor-media')
  async deleteEditorMedia(@Body() body: { url: string }) {
    return {
      data: await this.uploadsService.deleteEditorMedia(body.url),
    };
  }

  @Post('import-external')
  async importExternalImage(@Body() body: { url: string }) {
    return {
      data: await this.uploadsService.importExternalImage(body.url),
    };
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
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return {
      data: await this.uploadsService.saveEditorImage(this.getFirstFile(files)),
    };
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
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return {
      data: await this.uploadsService.saveEditorMedia(this.getFirstFile(files), ['audio']),
    };
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
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return {
      data: await this.uploadsService.saveEditorMedia(this.getFirstFile(files), ['video']),
    };
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
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return {
      data: await this.uploadsService.saveEditorMedia(this.getFirstFile(files)),
    };
  }

  private getFirstFile(files: Express.Multer.File[] | undefined): Express.Multer.File | undefined {
    return files?.[0];
  }
}
