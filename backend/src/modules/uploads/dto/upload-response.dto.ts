import { EditorMediaType } from '../uploads.constants';

export class UploadResponseDto {
  url!: string;
  filename!: string;
  mimeType!: string;
  mediaType!: EditorMediaType;
  size!: number;
}
