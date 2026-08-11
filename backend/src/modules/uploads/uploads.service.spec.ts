import { BadRequestException } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { Op } from 'sequelize';
import { UploadsService } from './uploads.service';
import {
  MAX_EDITOR_AUDIO_BYTES,
  MAX_EDITOR_IMAGE_BYTES,
  MAX_EDITOR_VIDEO_BYTES,
} from './uploads.constants';

const buildFile = (
  mimetype: string,
  buffer: Buffer,
  overrideSize?: number,
): Express.Multer.File =>
  ({
    mimetype,
    buffer,
    size: overrideSize ?? buffer.length,
    originalname: 'test-file',
  }) as Express.Multer.File;

describe('UploadsService', () => {
  let service: UploadsService;
  let sendSpy: jest.SpyInstance;
  let mediaAssetModel: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    const config = {
      get: jest.fn((key: string) => ({
        R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
        R2_ACCESS_KEY_ID: 'access-key',
        R2_SECRET_ACCESS_KEY: 'secret-key',
        R2_BUCKET: 'lingora-media',
        R2_PUBLIC_BASE_URL: 'https://media.example.com',
      })[key]),
    };
    mediaAssetModel = {
      create: jest.fn().mockResolvedValue({ id: 15 }),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    sendSpy = jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);
    service = new UploadsService(config as never, mediaAssetModel as never);
  });

  afterEach(() => sendSpy.mockRestore());

  it('rejects undefined file', () => {
    expect(() => service.assertEditorImage(undefined)).toThrow(
      BadRequestException,
    );
  });

  it('accepts a PNG file whose content matches its MIME type', () => {
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);

    expect(() =>
      service.assertEditorImage(buildFile('image/png', pngSignature)),
    ).not.toThrow();
  });

  it('rejects a file whose content does not match its MIME type', () => {
    const fakeImage = Buffer.from('not an image');

    expect(() =>
      service.assertEditorImage(buildFile('image/png', fakeImage)),
    ).toThrow(BadRequestException);
  });

  it('accepts audio files for editor media uploads', () => {
    const mp3Header = Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00', 'binary');

    expect(() =>
      service.assertEditorMedia(buildFile('audio/mpeg', mp3Header), ['audio']),
    ).not.toThrow();
  });

  it('accepts video files for editor media uploads', () => {
    const mp4Header = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    ]);

    expect(() =>
      service.assertEditorMedia(buildFile('video/mp4', mp4Header), ['video']),
    ).not.toThrow();
  });

  it('rejects audio files on the image-only endpoint validation', () => {
    const mp3Header = Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00', 'binary');

    expect(() =>
      service.assertEditorImage(buildFile('audio/mpeg', mp3Header)),
    ).toThrow(BadRequestException);
  });

  it('rejects image files exceeding maximum size limit of 5MB', () => {
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    const oversizedFile = buildFile(
      'image/png',
      pngSignature,
      MAX_EDITOR_IMAGE_BYTES + 1,
    );

    expect(() => service.assertEditorImage(oversizedFile)).toThrow(
      BadRequestException,
    );
  });

  it('rejects audio files exceeding maximum size limit of 25MB', () => {
    const mp3Header = Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00', 'binary');
    const oversizedFile = buildFile(
      'audio/mpeg',
      mp3Header,
      MAX_EDITOR_AUDIO_BYTES + 1,
    );

    expect(() =>
      service.assertEditorMedia(oversizedFile, ['audio']),
    ).toThrow(BadRequestException);
  });

  it('rejects video files exceeding maximum size limit of 95MB', () => {
    const mp4Header = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    ]);
    const oversizedFile = buildFile(
      'video/mp4',
      mp4Header,
      MAX_EDITOR_VIDEO_BYTES + 1,
    );

    expect(() =>
      service.assertEditorMedia(oversizedFile, ['video']),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported media MIME type', () => {
    const fakeExe = Buffer.from('MZ header content');
    expect(() =>
      service.assertEditorMedia(buildFile('application/x-msdownload', fakeExe)),
    ).toThrow(BadRequestException);
  });

  it('saves valid editor media and returns metadata', async () => {
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    const file = buildFile('image/png', pngSignature);

    const result = await service.saveEditorImage('7', file);

    expect(result.url).toMatch(/^https:\/\/media\.example\.com\/media\/7\/.+\.png$/);
    expect(result.assetId).toBe('15');
    expect(result.objectKey).toMatch(/^media\/7\/.+\.png$/);
    expect(result.mimeType).toBe('image/png');
    expect(result.mediaType).toBe('image');
    expect(result.size).toBe(pngSignature.length);
    expect(mediaAssetModel.create).toHaveBeenCalledWith(expect.objectContaining({
      purpose: 'post',
      post_id: null,
      status: 'temporary',
    }));
  });

  it('marks files from the dedicated avatar upload as avatar media', async () => {
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);

    await service.saveAvatarImage('7', buildFile('image/png', pngSignature));

    expect(mediaAssetModel.create).toHaveBeenCalledWith(expect.objectContaining({
      owner_id: '7',
      purpose: 'avatar',
      post_id: null,
    }));
  });

  it('deletes expired temporary media from R2 and marks it deleted', async () => {
    const asset = {
      id: '21',
      object_key: 'media/7/unused.png',
      update: jest.fn().mockResolvedValue(undefined),
    };
    mediaAssetModel.findAll.mockResolvedValue([asset]);

    await expect(service.cleanupExpiredTemporaryMedia()).resolves.toBe(1);

    expect(asset.update).toHaveBeenCalledWith(expect.objectContaining({
      post_id: null,
      status: 'deleted',
      deleted_at: expect.any(Date),
    }));
    expect(mediaAssetModel.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        post_id: null,
        deleted_at: null,
        [Op.or]: [
          { status: 'temporary' },
          { purpose: 'post', status: 'attached' },
        ],
      }),
    }));
  });

  it('detaches all media from a post inside the deletion transaction', async () => {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    mediaAssetModel.findAll.mockResolvedValue([{ id: '21' }, { id: '22' }]);

    await expect(
      service.detachPostMediaForDeletion('post-1', 'owner-1', transaction as never),
    ).resolves.toEqual(['21', '22']);

    expect(mediaAssetModel.findAll).toHaveBeenCalledWith({
      where: {
        post_id: 'post-1',
        owner_id: 'owner-1',
        purpose: 'post',
        deleted_at: null,
      },
      transaction,
      lock: 'UPDATE',
    });
    expect(mediaAssetModel.update).toHaveBeenCalledWith(
      expect.objectContaining({ post_id: null, status: 'temporary' }),
      expect.objectContaining({ transaction }),
    );
  });

  it('deletes only detached temporary post media after the transaction commits', async () => {
    const asset = {
      id: '21',
      object_key: 'media/7/detached.png',
      update: jest.fn().mockResolvedValue(undefined),
    };
    mediaAssetModel.findAll.mockResolvedValue([asset]);

    await expect(service.deleteDetachedPostMedia('7', ['21'])).resolves.toBeUndefined();

    expect(mediaAssetModel.findAll).toHaveBeenCalledWith({
      where: {
        id: { [Op.in]: ['21'] },
        owner_id: '7',
        purpose: 'post',
        post_id: null,
        status: 'temporary',
        deleted_at: null,
      },
    });
    expect(asset.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'deleted',
      deleted_at: expect.any(Date),
    }));
  });

  it('leaves detached media temporary when R2 deletion fails so cleanup can retry', async () => {
    const asset = {
      id: '21',
      object_key: 'media/7/detached.png',
      update: jest.fn(),
    };
    mediaAssetModel.findAll.mockResolvedValue([asset]);
    sendSpy.mockRejectedValueOnce(new Error('R2 unavailable'));

    await expect(service.deleteDetachedPostMedia('7', ['21'])).resolves.toBeUndefined();

    expect(asset.update).not.toHaveBeenCalled();
  });
});
