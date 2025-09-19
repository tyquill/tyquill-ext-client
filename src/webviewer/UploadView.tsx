import React, { useEffect, useState, useMemo } from 'react';
import { globalApiClient } from '../services/globalApiClient';
import { useI18n } from '../hooks/useI18n';
import { Document, Page, pdfjs } from 'react-pdf';
import styles from './ScrapView.module.css';
import { IoLinkOutline, IoTimeOutline } from 'react-icons/io5';
import { FiZoomIn, FiZoomOut, FiDownload } from 'react-icons/fi';
import { trackPDFDownloadBridge } from '../analytics/bridge';

// PDF.js worker setup - use local worker for Chrome extension
pdfjs.GlobalWorkerOptions.workerSrc = (globalThis as any).chrome?.runtime?.getURL('pdf.worker.min.js') || '/pdf.worker.min.js';


interface Props { id: number }

interface UploadData {
  title: string;
  url: string; // filePath
  description?: string;
  createdAt?: string;
  mimeType?: string;
  fileSize?: number;
}

interface PdfState {
  numPages: number | null;
  containerHeight: number;
  currentPage: number;
  scale: number;
}


const UploadView: React.FC<Props> = ({ id }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadData | null>(null);
  const [pdfState, setPdfState] = useState<PdfState>({
    numPages: null,
    containerHeight: 722,
    currentPage: 1,
    scale: 0.8
  });
  

  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        // 메타데이터
        const data: any = await globalApiClient.get(`/v1/uploaded-files/${id}`);
        setUpload({
          title: data.title,
          url: data.filePath,
          description: data.description,
          mimeType: data.mimeType,
          createdAt: data.createdAt,
          fileSize: data.fileSize,
        });
      } catch (e: any) {
        setError(e?.message || 'Failed to load upload file.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(1);

    return `${size} ${sizes[i]}`;
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setPdfState(prev => ({ ...prev, numPages }));
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const pages = container.querySelectorAll('[data-page-number]');
    let currentVisiblePage = 1;

    // Find the page that's most visible in the viewport
    pages.forEach((page) => {
      const rect = page.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Check if the page is visible in the container
      if (rect.top <= containerRect.top + containerRect.height / 2 &&
          rect.bottom >= containerRect.top + containerRect.height / 2) {
        const pageNumber = parseInt(page.getAttribute('data-page-number') || '1');
        currentVisiblePage = pageNumber;
      }
    });

    // Update current page only if it changed
    setPdfState(prev =>
      prev.currentPage !== currentVisiblePage
        ? { ...prev, currentPage: currentVisiblePage }
        : prev
    );
  };

  const onDocumentLoadError = (error: any) => {
    console.error('PDF load error:', error);
    setError(`PDF 로드 실패: ${error?.message || 'Unknown error'}`);
  };

  const scrollToPage = (pageNumber: number) => {
    const container = document.querySelector('.react-pdf__Document')?.parentElement;
    if (container) {
      const pageElement = container.querySelector(`[data-page-number="${pageNumber}"]`);
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handlePreviousPage = () => {
    const newPage = Math.max(pdfState.currentPage - 1, 1);
    setPdfState(prev => ({ ...prev, currentPage: newPage }));
    scrollToPage(newPage);
  };

  const handleNextPage = () => {
    const newPage = Math.min(pdfState.currentPage + 1, pdfState.numPages || 1);
    setPdfState(prev => ({ ...prev, currentPage: newPage }));
    scrollToPage(newPage);
  };

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= (pdfState.numPages || 1)) {
      setPdfState(prev => ({ ...prev, currentPage: page }));
      scrollToPage(page);
    }
  };

  const handleZoomIn = () => {
    setPdfState(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.25, 2.0)
    }));
  };

  const handleZoomOut = () => {
    setPdfState(prev => ({
      ...prev,
      scale: Math.max(prev.scale * 0.8, 0.3)
    }));
  };


  if (loading) return <div style={{ padding: 16 }}>{t('common_loading')}</div>;
  if (error) return <div style={{ padding: 16, color: 'red' }}>{error}</div>;
  if (!upload) return <div style={{ padding: 16 }}>No data available.</div>;

  return (
    <div className={`${styles.pageBg} ${styles.themeLight}`}>
      <div className={styles.viewer}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.titleBlock}>
              <div className={styles.title}>{upload.title}</div>
              <div className={styles.meta} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#666' }}>
                <span>{formatFileSize(upload.fileSize)}</span>
                <span>·</span>
                <span>
                  {upload.createdAt ?
                    new Date(upload.createdAt).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Unknown time'
                  }
                </span>
              </div>
            </div>
            <div className={styles.actions}>
              <a
                href={upload.url}
                download
                rel="noreferrer"
                onClick={() => {
                  trackPDFDownloadBridge({
                    file_id: id,
                    file_name: upload.title,
                    file_size: upload.fileSize,
                    mime_type: upload.mimeType
                  });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s ease',
                  textDecoration: 'none',
                  color: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <FiDownload size={16} />
              </a>
            </div>
          </div>
          <div className={styles.content} style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
            {upload.description && (
              <div style={{ marginBottom: 16, color: 'var(--text-primary)' }}>{upload.description}</div>
            )}

            {/* PDF Viewer */}
            {upload.mimeType === 'application/pdf' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', height: '100%' }}>
                <div
                  style={{
                    width: '100%',
                    maxWidth: '800px',
                    height: 'calc(100% - 60px)',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    overflow: 'auto',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    padding: '16px',
                    backgroundColor: '#f8f9fa'
                  }}
                  onScroll={handleScroll}
                >
                  <div className="react-pdf__Document" style={{ '--scale-factor': pdfState.scale, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' } as React.CSSProperties}>
                    <Document
                      file={upload.url}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      loading={<div style={{ textAlign: 'center', padding: '20px' }}>{t('common_loading')}</div>}
                      error={<div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>Failed to load PDF</div>}
                    >
                      {pdfState.numPages && Array.from(new Array(pdfState.numPages), (_, index) => (
                        <div key={`page_${index + 1}`} data-page-number={index + 1} style={{ marginBottom: '16px' }}>
                          <Page
                            pageNumber={index + 1}
                            scale={pdfState.scale}
                            className="react-pdf__Page"
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                          />
                        </div>
                      ))}
                    </Document>
                  </div>
                </div>

                {/* PDF Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <button
                    onClick={handlePreviousPage}
                    disabled={pdfState.currentPage <= 1}
                    style={{
                      padding: '6px 8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: pdfState.currentPage <= 1 ? 'not-allowed' : 'pointer',
                      opacity: pdfState.currentPage <= 1 ? 0.5 : 1,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}
                  >
                    ←
                  </button>

                  <input
                    type="number"
                    value={pdfState.currentPage}
                    onChange={handlePageChange}
                    min={1}
                    max={pdfState.numPages || 1}
                    style={{
                      width: '50px',
                      padding: '6px',
                      border: '1px solid #ddd',
                      background: '#f9f9f9',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}
                  />

                  <span style={{ fontSize: '14px', color: '#666' }}>/ {pdfState.numPages || 0}</span>

                  <button
                    onClick={handleNextPage}
                    disabled={pdfState.currentPage >= (pdfState.numPages || 1)}
                    style={{
                      padding: '6px 8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: pdfState.currentPage >= (pdfState.numPages || 1) ? 'not-allowed' : 'pointer',
                      opacity: pdfState.currentPage >= (pdfState.numPages || 1) ? 0.5 : 1,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}
                  >
                    →
                  </button>

                  <div style={{ width: '1px', height: '24px', backgroundColor: '#e0e0e0', margin: '0 8px' }}></div>

                  <button
                    onClick={handleZoomOut}
                    disabled={pdfState.scale <= 0.3}
                    style={{
                      padding: '6px 8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: pdfState.scale <= 0.3 ? 'not-allowed' : 'pointer',
                      opacity: pdfState.scale <= 0.3 ? 0.5 : 1,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}
                  >
                    <FiZoomOut size={16} />
                  </button>

                  <button
                    onClick={handleZoomIn}
                    disabled={pdfState.scale >= 2.0}
                    style={{
                      padding: '6px 8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: pdfState.scale >= 2.0 ? 'not-allowed' : 'pointer',
                      opacity: pdfState.scale >= 2.0 ? 0.5 : 1,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}
                  >
                    <FiZoomIn size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
                This file type cannot be previewed. Click "Download" to view it.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadView;

// Add comprehensive react-pdf styles
if (typeof document !== 'undefined') {
  const styleId = 'react-pdf-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Document styles */
      .react-pdf__Document {
        --scale-factor: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      /* Page styles */
      .react-pdf__Page {
        background-color: white;
        position: relative;
        min-width: min-content;
        min-height: min-content;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        margin-bottom: 8px;
      }

      .react-pdf__Page canvas {
        display: block;
        user-select: none;
      }

      .react-pdf__Page__canvas {
        display: block;
        user-select: none;
      }

      /* Text Layer styles */
      .react-pdf__Page__textContent {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        overflow: hidden;
        opacity: 0.2;
        line-height: 1.0;
        transform-origin: 0 0;
      }

      .react-pdf__Page__textContent .textLayer {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        overflow: hidden;
        line-height: 1.0;
      }

      .react-pdf__Page__textContent span {
        color: transparent;
        position: absolute;
        white-space: pre;
        cursor: text;
        transform-origin: 0% 0%;
      }

      .react-pdf__Page__textContent .markedContent {
        color: transparent;
        position: absolute;
        white-space: pre;
        cursor: text;
        transform-origin: 0% 0%;
      }

      .react-pdf__Page__textContent .markedContent span {
        color: transparent;
      }

      .react-pdf__Page__textContent .endOfContent {
        display: block;
        position: absolute;
        left: 0;
        top: 100%;
        right: 0;
        bottom: 0;
        z-index: -1;
        cursor: default;
        user-select: none;
      }

      /* Annotation Layer styles */
      .react-pdf__Page__annotations {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
      }

      .react-pdf__Page__annotations .annotationLayer {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
      }

      /* Structured Tree styles for accessibility */
      .react-pdf__Page__structTree {
        contain: strict;
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        width: 1px;
        white-space: nowrap;
      }

      .react-pdf__Page__structTree .structTree {
        contain: strict;
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        width: 1px;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }
}
