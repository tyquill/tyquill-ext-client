import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { globalApiClient } from '../services/globalApiClient';
import MarkdownRenderer from '../utils/markdownRenderer';
import styles from './ScrapView.module.css';
import { IoLinkOutline, IoTimeOutline } from 'react-icons/io5';

interface Props { id: number }

interface UploadData {
  title: string;
  url: string; // filePath
  description?: string;
  createdAt?: string;
  mimeType?: string;
}

interface AnalysisData {
  markdown: string;
  updatedAt?: string;
}

const UploadView: React.FC<Props> = ({ id }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  

  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        // 1) 메타데이터
        const data: any = await globalApiClient.get(`/v1/uploaded-files/${id}`);
        setUpload({
          title: data.title,
          url: data.filePath,
          description: data.description,
          mimeType: data.mimeType,
          createdAt: data.createdAt,
        });

        // 2) 분석/요약 마크다운 (업로드 전용 분석 조회)
        try {
          const res: any = await globalApiClient.get(`/v1/uploaded-files/${id}/analysis`);
          if (res && (res.markdown)) {
            setAnalysis({ markdown: res.markdown, updatedAt: res.updatedAt });
          } else {
            setAnalysis(null);
          }
        } catch (e) {
          // 분석 결과가 아직 없을 수 있으니 조용히 무시하고 안내 문구로 대체
          setAnalysis(null);
        }
      } catch (e: any) {
        setError(e?.message || '업로드 파일을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  

  const domain = useMemo(() => {
    try {
      if (!upload?.url) return '';
      const url = upload.url;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        const parts = hostname.split('.');
        return parts.length >= 3 ? parts.slice(-2).join('.') : hostname;
      }
      return '파일';
    } catch {
      return '';
    }
  }, [upload?.url]);

  const refreshAnalysis = useCallback(async () => {
    try {
      const res: any = await globalApiClient.get(`/v1/uploaded-files/${id}/analysis`);
      if (res && (res.markdown)) {
        setAnalysis({ markdown: res.markdown, updatedAt: res.updatedAt });
      } else {
        setAnalysis(null);
      }
    } catch {
      setAnalysis(null);
    }
  }, [id]);

  if (loading) return <div style={{ padding: 16 }}>불러오는 중...</div>;
  if (error) return <div style={{ padding: 16, color: 'red' }}>{error}</div>;
  if (!upload) return <div style={{ padding: 16 }}>데이터가 없습니다.</div>;

  return (
    <div className={`${styles.pageBg} ${styles.themeLight}`}>
      <div className={styles.viewer}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.titleBlock}>
              <div className={styles.title}>{upload.title}</div>
              <div className={styles.meta}>
                <span className={styles.pill}>
                  <span className={styles.pillIcon}><IoLinkOutline size={14} /></span>
                  <a className={styles.pillLink} href={upload.url} target="_blank" rel="noreferrer">{domain || '원본 파일'}</a>
                </span>
                {upload.createdAt && (
                  <span className={styles.pill}>
                    <span className={styles.pillIcon}><IoTimeOutline size={14} /></span>
                    {new Date(upload.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
            <div className={styles.actions}>
              <a className={`${styles.btn} ${styles.btnPrimary}`} href={upload.url} target="_blank" rel="noreferrer">
                원본 파일 열기
              </a>
              <button className={styles.btn} onClick={refreshAnalysis}>
                새로고침
              </button>
            </div>
          </div>
          <div className={styles.content}>
            {upload.description && (
              <div style={{ marginBottom: 16, color: 'var(--text-primary)' }}>{upload.description}</div>
            )}

            {analysis ? (
              <MarkdownRenderer content={analysis.markdown} />
            ) : (
              <div style={{ padding: 12, background: 'var(--surface-elev)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-secondary)' }}>
                아직 분석 결과가 없습니다. 처리 완료 후 이곳에 요약/분석 마크다운이 표시됩니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadView;
