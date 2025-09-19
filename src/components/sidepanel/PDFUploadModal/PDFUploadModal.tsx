import React, { useState, useCallback, useRef } from 'react';
import { IoClose, IoCloudUpload, IoDocument, IoAdd } from 'react-icons/io5';
import styles from './PDFUploadModal.module.css';
import { uploadService } from '../../../services/uploadService';
import { useToastHelpers } from '../../../hooks/useToast';
import { trackPDFUploadSuccessBridge, trackPDFUploadFailedBridge } from '../../../analytics/bridge';

interface PDFUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const PDFUploadModal: React.FC<PDFUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const { showSuccess, showError } = useToastHelpers();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      resetForm();
      onClose();
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      showError('파일 형식 오류', 'PDF 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      showError('파일 크기 초과', '30MB 이하의 파일만 업로드 가능합니다.');
      return;
    }

    setSelectedFile(file);
    // 파일명에서 제목 자동 추출 (확장자 제거)
    if (!title) {
      setTitle(file.name.replace(/\.pdf$/i, ''));
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (pdfFile) {
      handleFileSelect(pdfFile);
    } else {
      showError('파일 형식 오류', 'PDF 파일만 업로드 가능합니다.');
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      showError('파일 선택 필요', 'PDF 파일을 선택해주세요.');
      return;
    }

    if (!title.trim()) {
      showError('제목 입력 필요', '제목을 입력해주세요.');
      return;
    }

    try {
      setIsUploading(true);

      // 메타데이터와 함께 파일 업로드 (서버가 S3 업로드 + DB 저장까지 수행)
      await uploadService.uploadPDF(
        selectedFile,
        title.trim(),
        description.trim(),
      );

      showSuccess('업로드 완료', `${selectedFile.name}이 성공적으로 업로드되었습니다.`);

      // PDF 업로드 성공 이벤트 추적
      trackPDFUploadSuccessBridge({
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        title: title.trim(),
        has_description: description.trim().length > 0
      });

      resetForm();
      onUploadSuccess();
      onClose();
    } catch (error: any) {
      console.error('PDF upload error:', error);

      // PDF 업로드 실패 이벤트 추적
      trackPDFUploadFailedBridge({
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        title: title.trim(),
        error_message: error.message || '알 수 없는 오류',
        has_description: description.trim().length > 0
      });

      showError('업로드 실패', error.message || 'PDF 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <IoDocument size={20} />
            PDF 업로드
          </h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isUploading}
          >
            <IoClose size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* 파일 선택 영역 */}
          <div
            className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${selectedFile ? styles.hasFile : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
          >
            {selectedFile ? (
              <div className={styles.selectedFile}>
                <IoDocument size={32} className={styles.fileIcon} />
                <div className={styles.fileName}>{selectedFile.name}</div>
                <div className={styles.fileSize}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <button
                  className={styles.changeFileButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  파일 변경
                </button>
              </div>
            ) : (
              <>
                <IoCloudUpload size={40} className={styles.uploadIcon} />
                <div className={styles.dropzoneText}>
                  {isDragging
                    ? 'PDF 파일을 여기에 놓아주세요'
                    : 'PDF 파일을 드래그하거나 클릭하여 선택'}
                </div>
                <div className={styles.dropzoneSubtext}>최대 30MB</div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileSelect(file);
                }
              }}
              style={{ display: 'none' }}
            />
          </div>

          {/* 메타데이터 입력 영역 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              제목 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="PDF 문서의 제목을 입력하세요"
              disabled={isUploading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>설명</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="문서에 대한 설명을 입력하세요 (선택사항)"
              rows={3}
              disabled={isUploading}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.cancelButton}
            onClick={handleClose}
            disabled={isUploading}
          >
            취소
          </button>
          <button
            className={styles.uploadButton}
            onClick={handleUpload}
            disabled={!selectedFile || !title.trim() || isUploading}
          >
            {isUploading ? (
              <>
                <span className={styles.spinner} />
                업로드 중...
              </>
            ) : (
              '업로드'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
