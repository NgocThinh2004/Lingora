import { BadRequestException } from '@nestjs/common';
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

  beforeEach(() => {
    service = new UploadsService();
  });

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

  it('rejects video files exceeding maximum size limit of 100MB', () => {
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

    const result = await service.saveEditorImage(file);

    expect(result.url).toMatch(/^\/uploads\/.+\.png$/);
    expect(result.mimeType).toBe('image/png');
    expect(result.mediaType).toBe('image');
    expect(result.size).toBe(pngSignature.length);
  });
});
