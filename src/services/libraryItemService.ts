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

export interface TagDto {
  tagId: number;
  name: string;
  createdAt?: string;
}

class LibraryItemService {
  async list(type?: LibraryItemType): Promise<LibraryItemDto[]> {
    const query = type ? `?type=${type}` : '';
    return globalApiClient.get(`/v1/library-items${query}`);
  }

  async addTag(itemId: number, itemType: LibraryItemType, tagName: string): Promise<TagDto> {
    return globalApiClient.post(`/v1/library-items/${itemId}/tags?type=${itemType}`, {
      name: tagName
    });
  }

  async removeTag(itemId: number, itemType: LibraryItemType, tagId: number): Promise<void> {
    return globalApiClient.delete(`/v1/library-items/${itemId}/tags/${tagId}?type=${itemType}`);
  }

  async getTags(itemId: number, itemType: LibraryItemType): Promise<TagDto[]> {
    return globalApiClient.get(`/v1/library-items/${itemId}/tags?type=${itemType}`);
  }
}

export const libraryItemService = new LibraryItemService();

