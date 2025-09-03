import { globalApiClient } from './globalApiClient';

export type LibraryItemType = 'SCRAP' | 'UPLOAD';

export interface LibraryItemDto {
  id: number;
  type: LibraryItemType;
  title: string;
  description?: string;
  previewText?: string;
  url?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
}

class LibraryItemService {
  async list(type?: LibraryItemType): Promise<LibraryItemDto[]> {
    const query = type ? `?type=${type}` : '';
    return globalApiClient.get(`/v1/library-items${query}`);
  }
}

export const libraryItemService = new LibraryItemService();

