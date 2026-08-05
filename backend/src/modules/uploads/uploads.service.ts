import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { UploadResponseDto } from './dto/upload-response.dto';
import {
  EDITOR_MEDIA_MIME_CONFIG,
  EditorMediaMimeType,
  EditorMediaType,
} from './uploads.constants';

type EditorMediaConfig = {
  extension: string;
  mediaType: EditorMediaType;
  maxBytes: number;
};

@Injectable()
export class UploadsService {
  assertEditorImage(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
    this.validateEditorMedia(file, ['image']);
  }

  assertEditorMedia(
    file: Express.Multer.File | undefined,
    allowedMediaTypes: readonly EditorMediaType[] = ['image', 'audio', 'video'],
  ): asserts file is Express.Multer.File {
    this.validateEditorMedia(file, allowedMediaTypes);
  }

  async saveEditorImage(file: Express.Multer.File | undefined): Promise<UploadResponseDto> {
    return this.saveEditorMedia(file, ['image']);
  }

  async deleteEditorMedia(urlOrFilename: string): Promise<{ message: string }> {
    if (!urlOrFilename || typeof urlOrFilename !== 'string') {
      throw new BadRequestException('Media URL or filename is required');
    }

    const filename = urlOrFilename.replace(/\\/g, '/').split('/').pop()?.split('?')[0];
    if (!filename || filename.includes('..')) {
      throw new BadRequestException('Invalid filename');
    }

    const filePath = join(process.cwd(), 'storage', 'uploads', filename);

    try {
      await unlink(filePath);
      return { message: 'Media deleted successfully' };
    } catch {
      return { message: 'Media deleted' };
    }
  }

  async importExternalImage(url: string): Promise<UploadResponseDto> {
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      throw new BadRequestException('Invalid external image URL');
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new BadRequestException('Unable to fetch external image');
      }

      const mimeType =
        response.headers.get('content-type')?.split(';')[0]?.toLowerCase() ||
        'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fakeFile: Express.Multer.File = {
        mimetype: mimeType,
        buffer,
        size: buffer.length,
        originalname: url.split('/').pop()?.split('?')[0] || 'external-image',
      } as Express.Multer.File;

      return await this.saveEditorImage(fakeFile);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to download external image');
    }
  }

  async saveEditorMedia(
    file: Express.Multer.File | undefined,
    allowedMediaTypes: readonly EditorMediaType[] = ['image', 'audio', 'video'],
  ): Promise<UploadResponseDto> {
    const config = this.validateEditorMedia(file, allowedMediaTypes);
    const mediaFile = file as Express.Multer.File;
    const uploadDirectory = join(process.cwd(), 'storage', 'uploads');
    const filename = `${randomUUID()}.${config.extension}`;

    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(join(uploadDirectory, filename), mediaFile.buffer);

    return {
      url: this.buildPublicUploadUrl(filename),
      filename,
      mimeType: mediaFile.mimetype,
      mediaType: config.mediaType,
      size: mediaFile.size,
    };
  }

  buildPublicUploadUrl(filename: string): string {
    const normalizedFilename = filename.replace(/\\/g, '/').split('/').pop();
    if (!normalizedFilename) {
      throw new BadRequestException('Invalid upload filename');
    }

    return `/uploads/${encodeURIComponent(normalizedFilename)}`;
  }

  private validateEditorMedia(
    file: Express.Multer.File | undefined,
    allowedMediaTypes: readonly EditorMediaType[],
  ): EditorMediaConfig {
    if (!file) {
      throw new BadRequestException('Media file is required');
    }

    const config = EDITOR_MEDIA_MIME_CONFIG[file.mimetype as EditorMediaMimeType];
    if (!config || !allowedMediaTypes.includes(config.mediaType)) {
      throw new BadRequestException(`Unsupported media type: ${file.mimetype}`);
    }

    if (file.size > config.maxBytes) {
      throw new BadRequestException(`${config.mediaType} must be ${config.maxBytes} bytes or smaller`);
    }

    if (!this.contentMatchesMimeType(file.buffer, file.mimetype)) {
      throw new BadRequestException('Media content does not match its MIME type');
    }

    return config;
  }

  private contentMatchesMimeType(buffer: Buffer | undefined, mimeType: string): boolean {
    if (!buffer || buffer.length < 4) {
      return false;
    }

    if (mimeType === 'image/jpeg') {
      return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    }

    if (mimeType === 'image/png') {
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }

    if (mimeType === 'image/gif') {
      const gifHeader = buffer.subarray(0, 6).toString('ascii');
      return gifHeader === 'GIF87a' || gifHeader === 'GIF89a';
    }

    if (mimeType === 'image/webp') {
      return this.isRiffContainer(buffer, 'WEBP');
    }

    if (mimeType === 'audio/aac') {
      return this.isAac(buffer);
    }

    if (mimeType === 'audio/mp3' || mimeType === 'audio/mpeg') {
      return this.isMp3(buffer);
    }

    if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') {
      return this.isRiffContainer(buffer, 'WAVE');
    }

    if (mimeType === 'audio/mp4' || mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
      return this.isIsoBaseMediaFile(buffer);
    }

    if (mimeType === 'audio/ogg' || mimeType === 'video/ogg') {
      return buffer.subarray(0, 4).toString('ascii') === 'OggS';
    }

    if (mimeType === 'audio/webm' || mimeType === 'video/webm') {
      return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    }

    return false;
  }

  private isRiffContainer(buffer: Buffer, format: string): boolean {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === format
    );
  }

  private isMp3(buffer: Buffer): boolean {
    return (
      buffer.subarray(0, 3).toString('ascii') === 'ID3' ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    );
  }

  private isAac(buffer: Buffer): boolean {
    return buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0;
  }

  private isIsoBaseMediaFile(buffer: Buffer): boolean {
    return buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  }
}
