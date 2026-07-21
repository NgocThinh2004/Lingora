import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
  UploadedFiles,
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

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

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
    @Headers('x-user-id') userId: string | undefined,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    this.assertAuthenticated(userId);

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
    @Headers('x-user-id') userId: string | undefined,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    this.assertAuthenticated(userId);

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
    @Headers('x-user-id') userId: string | undefined,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    this.assertAuthenticated(userId);

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
    @Headers('x-user-id') userId: string | undefined,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    this.assertAuthenticated(userId);

    return {
      data: await this.uploadsService.saveEditorMedia(this.getFirstFile(files)),
    };
  }

  private assertAuthenticated(userId: string | undefined): void {
    if (!userId?.trim()) {
      throw new UnauthorizedException('x-user-id header is required until the auth guard is available');
    }
  }

  private getFirstFile(files: Express.Multer.File[] | undefined): Express.Multer.File | undefined {
    return files?.[0];
  }
}
