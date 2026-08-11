import { validateUploadFile, UPLOAD_LIMITS } from './upload-validator';

describe('upload-validator', () => {
  it('returns file_required when file is missing', () => {
    const result = validateUploadFile(null, 'image');
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe('file_required');
  });

  it('validates a valid image file', () => {
    const file = new File(['dummy content'], 'photo.png', { type: 'image/png' });
    const result = validateUploadFile(file, 'image');
    expect(result.valid).toBe(true);
  });

  it('rejects an image file exceeding 5MB size limit', () => {
    const largeBuffer = new ArrayBuffer(UPLOAD_LIMITS.image.maxBytes + 1);
    const file = new File([largeBuffer], 'large.png', { type: 'image/png' });
    const result = validateUploadFile(file, 'image');
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe('file_too_large');
    expect(result.params).toEqual({ maxSize: 5 });
  });

  it('rejects an unsupported file format', () => {
    const file = new File(['text content'], 'script.exe', { type: 'application/x-msdownload' });
    const result = validateUploadFile(file, 'image');
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe('invalid_file_type');
  });

  it('validates a valid audio file under 25MB limit', () => {
    const file = new File(['audio content'], 'track.mp3', { type: 'audio/mpeg' });
    const result = validateUploadFile(file, 'audio');
    expect(result.valid).toBe(true);
  });

  it('rejects an audio file exceeding 25MB limit', () => {
    const largeBuffer = new ArrayBuffer(UPLOAD_LIMITS.audio.maxBytes + 1);
    const file = new File([largeBuffer], 'long.mp3', { type: 'audio/mpeg' });
    const result = validateUploadFile(file, 'audio');
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe('file_too_large');
    expect(result.params).toEqual({ maxSize: 25 });
  });

  it('validates a valid video file under 95MB limit', () => {
    const file = new File(['video content'], 'clip.mp4', { type: 'video/mp4' });
    const result = validateUploadFile(file, 'video');
    expect(result.valid).toBe(true);
  });

  it('rejects a video file exceeding 95MB limit', () => {
    const largeBuffer = new ArrayBuffer(UPLOAD_LIMITS.video.maxBytes + 1);
    const file = new File([largeBuffer], 'movie.mp4', { type: 'video/mp4' });
    const result = validateUploadFile(file, 'video');
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe('file_too_large');
    expect(result.params).toEqual({ maxSize: 95 });
  });
});
