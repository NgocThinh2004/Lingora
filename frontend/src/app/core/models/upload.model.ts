export type EditorMediaType = 'image' | 'audio' | 'video';

export interface UploadResponse {
  url: string;
  filename: string;
  mimeType: string;
  mediaType: EditorMediaType;
  size: number;
}
