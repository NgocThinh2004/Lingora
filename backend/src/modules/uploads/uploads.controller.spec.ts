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
              url: '/uploads/test.png',
              filename: 'test.png',
              mimeType: 'image/png',
              mediaType: 'image',
              size: 100,
            }),
            saveEditorMedia: jest.fn().mockResolvedValue({
              url: '/uploads/test.mp3',
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

  it('delegates uploadEditorImage to saveEditorImage', async () => {
    const file = { originalname: 'test.png' } as Express.Multer.File;
    const result = await controller.uploadEditorImage([file]);

    expect(service.saveEditorImage).toHaveBeenCalledWith(file);
    expect(result).toEqual({
      data: {
        url: '/uploads/test.png',
        filename: 'test.png',
        mimeType: 'image/png',
        mediaType: 'image',
        size: 100,
      },
    });
  });

  it('delegates uploadEditorAudio to saveEditorMedia with audio constraint', async () => {
    const file = { originalname: 'test.mp3' } as Express.Multer.File;
    const result = await controller.uploadEditorAudio([file]);

    expect(service.saveEditorMedia).toHaveBeenCalledWith(file, ['audio']);
    expect(result.data.mediaType).toBe('audio');
  });

  it('delegates uploadEditorVideo to saveEditorMedia with video constraint', async () => {
    const file = { originalname: 'test.mp4' } as Express.Multer.File;
    await controller.uploadEditorVideo([file]);

    expect(service.saveEditorMedia).toHaveBeenCalledWith(file, ['video']);
  });

  it('delegates uploadEditorMedia to saveEditorMedia', async () => {
    const file = { originalname: 'test.png' } as Express.Multer.File;
    await controller.uploadEditorMedia([file]);

    expect(service.saveEditorMedia).toHaveBeenCalledWith(file);
  });
});
