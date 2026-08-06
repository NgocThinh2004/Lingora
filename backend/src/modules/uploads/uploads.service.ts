import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { Op, Transaction } from 'sequelize';
import { UploadResponseDto } from './dto/upload-response.dto';
import { MediaAsset } from './models/media-asset.model';
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

type R2Config = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

@Injectable()
export class UploadsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UploadsService.name);
  private s3Client?: S3Client;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(MediaAsset) private readonly mediaAssetModel: typeof MediaAsset,
  ) {}

  onModuleInit(): void {
    const intervalMinutes = this.getPositiveConfigNumber('TEMP_MEDIA_CLEANUP_INTERVAL_MINUTES', 60);
    void this.cleanupExpiredTemporaryMedia().catch(error => this.logCleanupError(error));
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpiredTemporaryMedia().catch(error => this.logCleanupError(error));
    }, intervalMinutes * 60 * 1000);
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  assertEditorImage(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
    this.validateEditorMedia(file, ['image']);
  }

  assertEditorMedia(
    file: Express.Multer.File | undefined,
    allowedMediaTypes: readonly EditorMediaType[] = ['image', 'audio', 'video'],
  ): asserts file is Express.Multer.File {
    this.validateEditorMedia(file, allowedMediaTypes);
  }

  async saveEditorImage(
    ownerId: string,
    file: Express.Multer.File | undefined,
  ): Promise<UploadResponseDto> {
    return this.saveEditorMedia(ownerId, file, ['image']);
  }

  async saveAvatarImage(
    ownerId: string,
    file: Express.Multer.File | undefined,
  ): Promise<UploadResponseDto> {
    return this.saveMedia(ownerId, file, ['image'], 'avatar');
  }

  async deleteEditorMedia(ownerId: string, urlOrObjectKey: string): Promise<{ message: string }> {
    if (!urlOrObjectKey || typeof urlOrObjectKey !== 'string') {
      throw new BadRequestException('Media URL or object key is required');
    }

    const objectKey = this.extractR2ObjectKey(urlOrObjectKey);
    if (!objectKey) {
      throw new BadRequestException('Invalid R2 media URL or object key');
    }

    const asset = await this.mediaAssetModel.findOne({
      where: {
        object_key: objectKey,
        owner_id: ownerId,
        purpose: 'post',
        deleted_at: null,
      },
    });
    if (!asset) {
      return { message: 'Media not found or already deleted' };
    }

    if (asset.post_id) {
      return { message: 'Media is still attached to a saved post' };
    }
    await this.deleteAssetFromStorage(asset);
    return { message: 'Media deleted successfully' };
  }

  async importExternalImage(ownerId: string, url: string): Promise<UploadResponseDto> {
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      throw new BadRequestException('Invalid external image URL');
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new BadRequestException('Unable to fetch external image');
      }

      const mimeType = response.headers.get('content-type')?.split(';')[0]?.toLowerCase() || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fakeFile: Express.Multer.File = {
        mimetype: mimeType,
        buffer,
        size: buffer.length,
        originalname: url.split('/').pop()?.split('?')[0] || 'external-image',
      } as Express.Multer.File;

      return await this.saveEditorImage(ownerId, fakeFile);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to download external image');
    }
  }

  async saveEditorMedia(
    ownerId: string,
    file: Express.Multer.File | undefined,
    allowedMediaTypes: readonly EditorMediaType[] = ['image', 'audio', 'video'],
  ): Promise<UploadResponseDto> {
    return this.saveMedia(ownerId, file, allowedMediaTypes, 'post');
  }

  private async saveMedia(
    ownerId: string,
    file: Express.Multer.File | undefined,
    allowedMediaTypes: readonly EditorMediaType[],
    purpose: 'avatar' | 'post',
  ): Promise<UploadResponseDto> {
    const config = this.validateEditorMedia(file, allowedMediaTypes);
    const mediaFile = file as Express.Multer.File;
    const r2 = this.getR2Config();
    const filename = `${randomUUID()}.${config.extension}`;
    const objectKey = `media/${ownerId}/${filename}`;

    await this.getS3Client(r2).send(new PutObjectCommand({
      Bucket: r2.bucket,
      Key: objectKey,
      Body: mediaFile.buffer,
      ContentType: mediaFile.mimetype,
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    try {
      const now = new Date();
      const asset = await this.mediaAssetModel.create({
        owner_id: ownerId,
        purpose,
        post_id: null,
        object_key: objectKey,
        media_type: config.mediaType,
        mime_type: mediaFile.mimetype,
        original_name: this.safeOriginalName(mediaFile.originalname),
        size_bytes: mediaFile.size,
        width: null,
        height: null,
        duration_seconds: null,
        status: 'temporary',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      return {
        assetId: String(asset.id),
        objectKey,
        url: this.buildPublicR2Url(objectKey, r2.publicBaseUrl),
        filename,
        mimeType: mediaFile.mimetype,
        mediaType: config.mediaType,
        size: mediaFile.size,
      };
    } catch (error) {
      await this.getS3Client(r2).send(new DeleteObjectCommand({
        Bucket: r2.bucket,
        Key: objectKey,
      })).catch(() => undefined);
      throw error;
    }
  }

  async attachAvatar(
    ownerId: string,
    assetId: string,
    transaction: Transaction,
  ): Promise<MediaAsset> {
    const asset = await this.mediaAssetModel.findOne({
      where: {
        id: assetId,
        owner_id: ownerId,
        purpose: 'avatar',
        post_id: null,
        media_type: 'image',
        deleted_at: null,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!asset) {
      throw new BadRequestException('Avatar media is unavailable');
    }
    await asset.update({ status: 'attached', updated_at: new Date() }, { transaction });
    return asset;
  }

  async deleteDetachedAvatar(ownerId: string, assetId: string): Promise<void> {
    const asset = await this.mediaAssetModel.findOne({
      where: {
        id: assetId,
        owner_id: ownerId,
        purpose: 'avatar',
        post_id: null,
        deleted_at: null,
      },
    });
    if (!asset) return;
    await asset.update({ status: 'temporary', updated_at: new Date() });
    await this.deleteAssetFromStorage(asset);
  }

  async syncPostMedia(
    postId: string,
    ownerId: string,
    contents: Array<string | null | undefined>,
    transaction: Transaction,
  ): Promise<void> {
    const objectKeys = [...new Set(contents.flatMap(content => this.extractR2ObjectKeys(content || '')))];
    const assets = objectKeys.length
      ? await this.mediaAssetModel.findAll({
          where: {
            object_key: { [Op.in]: objectKeys },
            owner_id: ownerId,
            purpose: 'post',
            deleted_at: null,
          },
          transaction,
        })
      : [];
    const invalidAsset = assets.find(asset => asset.post_id && String(asset.post_id) !== String(postId));
    if (invalidAsset || assets.length !== objectKeys.length) {
      throw new BadRequestException('A media file is unavailable or already belongs to another post');
    }

    const nextIds = new Set(assets.map(asset => String(asset.id)));
    const existing = await this.mediaAssetModel.findAll({
      where: { post_id: postId, purpose: 'post', deleted_at: null },
      transaction,
    });
    const removedIds = existing
      .map(item => String(item.id))
      .filter(assetId => !nextIds.has(assetId));

    if (removedIds.length) {
      await this.mediaAssetModel.update(
        { post_id: null, status: 'temporary', updated_at: new Date() },
        { where: { id: { [Op.in]: removedIds } }, transaction },
      );
    }

    const assetIds = assets.map(asset => asset.id);
    if (assetIds.length) {
      await this.mediaAssetModel.update(
        { post_id: postId, status: 'attached', updated_at: new Date() },
        { where: { id: { [Op.in]: assetIds } }, transaction },
      );
    }
  }

  async cleanupExpiredTemporaryMedia(): Promise<number> {
    const ttlHours = this.getPositiveConfigNumber('TEMP_MEDIA_TTL_HOURS', 24);
    const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000);
    const assets = await this.mediaAssetModel.findAll({
      where: {
        status: 'temporary',
        post_id: null,
        deleted_at: null,
        updated_at: { [Op.lt]: cutoff },
      },
    });

    let deleted = 0;
    for (const asset of assets) {
      try {
        await this.deleteAssetFromStorage(asset);
        deleted += 1;
      } catch (error) {
        this.logger.warn(`Unable to clean temporary media ${asset.id}: ${this.errorMessage(error)}`);
      }
    }
    if (deleted) this.logger.log(`Cleaned ${deleted} expired temporary media file(s)`);
    return deleted;
  }

  publicUrlForObjectKey(objectKey: string): string {
    return this.buildPublicR2Url(objectKey, this.getR2Config().publicBaseUrl);
  }

  private getR2Config(): R2Config {
    const values = {
      endpoint: this.configService.get<string>('R2_ENDPOINT')?.trim(),
      accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID')?.trim(),
      secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY')?.trim(),
      bucket: this.configService.get<string>('R2_BUCKET')?.trim(),
      publicBaseUrl: this.configService.get<string>('R2_PUBLIC_BASE_URL')?.trim().replace(/\/+$/, ''),
    };
    if (Object.values(values).some(value => !value)) {
      throw new ServiceUnavailableException('R2 storage is not fully configured');
    }
    return values as R2Config;
  }

  private getS3Client(config: R2Config): S3Client {
    this.s3Client ??= new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    return this.s3Client;
  }

  private buildPublicR2Url(objectKey: string, publicBaseUrl: string): string {
    return `${publicBaseUrl}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
  }

  private extractR2ObjectKeys(html: string): string[] {
    const values = [...html.matchAll(/\b(?:src|poster)=(['"])(.*?)\1/gi)].map(match => match[2]);
    return values.map(value => this.extractR2ObjectKey(value)).filter((value): value is string => Boolean(value));
  }

  private extractR2ObjectKey(urlOrObjectKey: string): string | null {
    const normalized = urlOrObjectKey.trim();
    const publicBaseUrl = this.configService.get<string>('R2_PUBLIC_BASE_URL')?.trim().replace(/\/+$/, '');
    if (publicBaseUrl && normalized.startsWith(`${publicBaseUrl}/`)) {
      return normalized.slice(publicBaseUrl.length + 1).split('/').map(decodeURIComponent).join('/');
    }
    if (/^media\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/.test(normalized)) {
      return normalized;
    }
    return null;
  }

  private async deleteAssetFromStorage(asset: MediaAsset): Promise<void> {
    const r2 = this.getR2Config();
    await this.getS3Client(r2).send(new DeleteObjectCommand({
      Bucket: r2.bucket,
      Key: asset.object_key,
    }));
    await asset.update({
      post_id: null,
      status: 'deleted',
      deleted_at: new Date(),
      updated_at: new Date(),
    });
  }

  private getPositiveConfigNumber(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private logCleanupError(error: unknown): void {
    this.logger.warn(`Temporary media cleanup failed: ${this.errorMessage(error)}`);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private safeOriginalName(value: string | undefined): string | null {
    const normalized = value?.replace(/[\u0000-\u001f\u007f]/g, '').trim();
    return normalized ? normalized.slice(0, 255) : null;
  }

  private validateEditorMedia(
    file: Express.Multer.File | undefined,
    allowedMediaTypes: readonly EditorMediaType[],
  ): EditorMediaConfig {
    if (!file) throw new BadRequestException('Media file is required');
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
    if (!buffer || buffer.length < 4) return false;
    if (mimeType === 'image/jpeg') return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimeType === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
    if (mimeType === 'image/webp') return this.isRiffContainer(buffer, 'WEBP');
    if (mimeType === 'audio/aac') return this.isAac(buffer);
    if (mimeType === 'audio/mp3' || mimeType === 'audio/mpeg') return this.isMp3(buffer);
    if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') return this.isRiffContainer(buffer, 'WAVE');
    if (mimeType === 'audio/mp4' || mimeType === 'video/mp4' || mimeType === 'video/quicktime') return this.isIsoBaseMediaFile(buffer);
    if (mimeType === 'audio/ogg' || mimeType === 'video/ogg') return buffer.subarray(0, 4).toString('ascii') === 'OggS';
    if (mimeType === 'audio/webm' || mimeType === 'video/webm') return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    return false;
  }

  private isRiffContainer(buffer: Buffer, format: string): boolean {
    return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === format;
  }

  private isMp3(buffer: Buffer): boolean {
    return buffer.subarray(0, 3).toString('ascii') === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  }

  private isAac(buffer: Buffer): boolean {
    return buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0;
  }

  private isIsoBaseMediaFile(buffer: Buffer): boolean {
    return buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  }
}
