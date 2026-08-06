import { Test, TestingModule } from '@nestjs/testing';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

describe('UploadsController', () => {
  let controller: UploadsController;
  let service: UploadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [
        {
          provide: UploadsService,
          useValue: {
            saveEditorImage: jest.fn().mockResolvedValue({
              assetId: '1',
              objectKey: 'media/7/test.png',
              url: 'https://media.example.com/media/7/test.png',
              filename: 'test.png',
              mimeType: 'image/png',
              mediaType: 'image',
              size: 100,
            }),
            saveAvatarImage: jest.fn().mockResolvedValue({
              assetId: '3',
              objectKey: 'media/7/avatar.png',
              url: 'https://media.example.com/media/7/avatar.png',
              filename: 'avatar.png',
              mimeType: 'image/png',
              mediaType: 'image',
              size: 100,
            }),
            saveEditorMedia: jest.fn().mockResolvedValue({
              assetId: '2',
              objectKey: 'media/7/test.mp3',
              url: 'https://media.example.com/media/7/test.mp3',
              filename: 'test.mp3',
              mimeType: 'audio/mpeg',
              mediaType: 'audio',
              size: 500,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<UploadsController>(UploadsController);
    service = module.get<UploadsService>(UploadsService);
  });

  it('delegates avatar uploads to the dedicated avatar service method', async () => {
    const file = { originalname: 'avatar.png' } as Express.Multer.File;

    await controller.uploadAvatar('7', [file]);

    expect(service.saveAvatarImage).toHaveBeenCalledWith('7', file);
  });

  it('delegates uploadEditorImage to saveEditorImage', async () => {
    const file = { originalname: 'test.png' } as Express.Multer.File;
    const result = await controller.uploadEditorImage('7', [file]);

    expect(service.saveEditorImage).toHaveBeenCalledWith('7', file);
    expect(result).toEqual({
      data: {
        assetId: '1',
        objectKey: 'media/7/test.png',
        url: 'https://media.example.com/media/7/test.png',
        filename: 'test.png',
        mimeType: 'image/png',
        mediaType: 'image',
        size: 100,
      },
    });
  });

  it('delegates uploadEditorAudio to saveEditorMedia with audio constraint', async () => {
    const file = { originalname: 'test.mp3' } as Express.Multer.File;
    const result = await controller.uploadEditorAudio('7', [file]);

    expect(service.saveEditorMedia).toHaveBeenCalledWith('7', file, ['audio']);
    expect(result.data.mediaType).toBe('audio');
  });

  it('delegates uploadEditorVideo to saveEditorMedia with video constraint', async () => {
    const file = { originalname: 'test.mp4' } as Express.Multer.File;
    const result = await controller.uploadEditorVideo('7', [file]);

    expect(service.saveEditorMedia).toHaveBeenCalledWith('7', file, ['video']);
  });

  it('delegates uploadEditorMedia to saveEditorMedia', async () => {
    const file = { originalname: 'test.png' } as Express.Multer.File;
    const result = await controller.uploadEditorMedia('7', [file]);

    expect(service.saveEditorMedia).toHaveBeenCalledWith('7', file);
  });
});
