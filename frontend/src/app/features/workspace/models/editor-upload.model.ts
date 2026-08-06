
export type EditorMediaType = 'image' | 'audio' | 'video';

export interface UploadResponse {
  assetId: string;
  objectKey: string;
  url: string;
  filename: string;
  mimeType: string;
  mediaType: EditorMediaType;
  size: number;
}
