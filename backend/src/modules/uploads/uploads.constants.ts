export const EDITOR_IMAGE_FIELD = 'image';
export const EDITOR_AUDIO_FIELD = 'audio';
export const EDITOR_VIDEO_FIELD = 'video';
export const EDITOR_MEDIA_FIELD = 'media';
export const MAX_EDITOR_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_EDITOR_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_EDITOR_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_EDITOR_MEDIA_BYTES = MAX_EDITOR_VIDEO_BYTES;

export const ALLOWED_EDITOR_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type EditorImageMimeType = (typeof ALLOWED_EDITOR_IMAGE_MIME_TYPES)[number];

export const ALLOWED_EDITOR_AUDIO_MIME_TYPES = [
  'audio/aac',
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-wav',
] as const;

export const ALLOWED_EDITOR_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/ogg',
  'video/quicktime',
  'video/webm',
] as const;

export type EditorMediaType = 'image' | 'audio' | 'video';
export type EditorAudioMimeType = (typeof ALLOWED_EDITOR_AUDIO_MIME_TYPES)[number];
export type EditorVideoMimeType = (typeof ALLOWED_EDITOR_VIDEO_MIME_TYPES)[number];
export type EditorMediaMimeType = EditorImageMimeType | EditorAudioMimeType | EditorVideoMimeType;

export const EDITOR_MEDIA_MIME_CONFIG: Record<
  EditorMediaMimeType,
  { extension: string; mediaType: EditorMediaType; maxBytes: number }
> = {
  'image/jpeg': { extension: 'jpg', mediaType: 'image', maxBytes: MAX_EDITOR_IMAGE_BYTES },
  'image/png': { extension: 'png', mediaType: 'image', maxBytes: MAX_EDITOR_IMAGE_BYTES },
  'image/webp': { extension: 'webp', mediaType: 'image', maxBytes: MAX_EDITOR_IMAGE_BYTES },
  'image/gif': { extension: 'gif', mediaType: 'image', maxBytes: MAX_EDITOR_IMAGE_BYTES },
  'audio/aac': { extension: 'aac', mediaType: 'audio', maxBytes: MAX_EDITOR_AUDIO_BYTES },
  'audio/mp3': { extension: 'mp3', mediaType: 'audio', maxBytes: MAX_EDITOR_AUDIO_BYTES },
  'audio/mpeg': { extension: 'mp3', mediaType: 'audio', maxBytes: MAX_EDITOR_AUDIO_BYTES },
  'audio/mp4': { extension: 'm4a', mediaType: 'audio', maxBytes: MAX_EDITOR_AUDIO_BYTES },
  'audio/ogg': { extension: 'ogg', mediaType: 'audio', maxBytes: MAX_EDITOR_AUDIO_BYTES },
  'audio/wav': { extension: 'wav', mediaType: 'audio', maxBytes: MAX_EDITOR_AUDIO_BYTES },
  'audio/webm': { extension: 'webm', mediaType: 'audio', maxBytes: MAX_EDITOR_AUDIO_BYTES },
  'audio/x-wav': { extension: 'wav', mediaType: 'audio', maxBytes: MAX_EDITOR_AUDIO_BYTES },
  'video/mp4': { extension: 'mp4', mediaType: 'video', maxBytes: MAX_EDITOR_VIDEO_BYTES },
  'video/ogg': { extension: 'ogv', mediaType: 'video', maxBytes: MAX_EDITOR_VIDEO_BYTES },
  'video/quicktime': { extension: 'mov', mediaType: 'video', maxBytes: MAX_EDITOR_VIDEO_BYTES },
  'video/webm': { extension: 'webm', mediaType: 'video', maxBytes: MAX_EDITOR_VIDEO_BYTES },
};
