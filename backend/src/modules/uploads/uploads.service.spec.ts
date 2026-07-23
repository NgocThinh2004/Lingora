import { BadRequestException } from '@nestjs/common';
import { UploadsService } from './uploads.service';

const buildFile = (mimetype: string, buffer: Buffer): Express.Multer.File =>
  ({
    mimetype,
    buffer,
    size: buffer.length,
  }) as Express.Multer.File;

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(() => {
    service = new UploadsService();
  });

  it('accepts a PNG file whose content matches its MIME type', () => {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

    expect(() => service.assertEditorImage(buildFile('image/png', pngSignature))).not.toThrow();
  });

  it('rejects a file whose content does not match its MIME type', () => {
    const fakeImage = Buffer.from('not an image');

    expect(() => service.assertEditorImage(buildFile('image/png', fakeImage))).toThrow(BadRequestException);
  });

  it('accepts audio files for editor media uploads', () => {
    const mp3Header = Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00', 'binary');

    expect(() => service.assertEditorMedia(buildFile('audio/mpeg', mp3Header), ['audio'])).not.toThrow();
  });

  it('accepts video files for editor media uploads', () => {
    const mp4Header = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    ]);

    expect(() => service.assertEditorMedia(buildFile('video/mp4', mp4Header), ['video'])).not.toThrow();
  });

  it('rejects audio files on the image-only endpoint validation', () => {
    const mp3Header = Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00', 'binary');

    expect(() => service.assertEditorImage(buildFile('audio/mpeg', mp3Header))).toThrow(BadRequestException);
  });
});
