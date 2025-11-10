import { globalApiClient } from './globalApiClient';
import { browser } from 'wxt/browser';

interface UploadResponse {
  url: string;
  name: string;
  size: number;
  uploadedBy: string;
  title?: string;
  description?: string;
}

interface FileMetadata { title?: string; description?: string }

class UploadService {
  private uploadEndpoint = '/v1/uploaded-files/upload';

  async uploadFile(file: File, metadata?: FileMetadata): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // 메타데이터를 별도 필드로 추가
      if (metadata?.title) {
        formData.append('title', metadata.title);
      }
      
      if (metadata?.description) {
        formData.append('description', metadata.description);
      }

      // S3 업로드 엔드포인트 호출
      const response = await globalApiClient.post<any>(this.uploadEndpoint, formData);

      return {
        url: response.filePath,
        name: response.fileName,
        size: response.fileSize,
        uploadedBy: response.user?.userId || '',
        title: response.title,
        description: response.description,
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      throw new Error(error.message || 'Failed to upload file');
    }
  }

  async uploadPDF(pdfFile: File, title?: string, description?: string): Promise<UploadResponse> {
    if (pdfFile.type !== 'application/pdf') {
      throw new Error('Only PDF files are supported');
    }

    // 서버에서 현재 30MB 제한. 필요 시 조정 가능
    if (pdfFile.size > 30 * 1024 * 1024) {
      throw new Error('파일 크기는 30MB 이하여야 합니다.');
    }

    return this.uploadFile(pdfFile, {
      title: title || pdfFile.name.replace(/\.pdf$/i, ''),
      description: description || '',
    });
  }
  // For pre-signed flow (not used in server-proxy mode), we would add a separate method.
}

export const uploadService = new UploadService();
