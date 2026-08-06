import { EditorMediaType } from '../uploads.constants';

export class UploadResponseDto {
  assetId!: string;
  objectKey!: string;
  url!: string;
  filename!: string;
  mimeType!: string;
  mediaType!: EditorMediaType;
  size!: number;
}
