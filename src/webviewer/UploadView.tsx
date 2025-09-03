import React, { useEffect, useState, useCallback } from 'react';
import { globalApiClient } from '../services/globalApiClient';
import MarkdownRenderer from '../utils/markdownRenderer';

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

        // 2) 분석/요약 마크다운 (향후 tyquill-agent 결과를 서버가 제공)
        // 예상 엔드포인트: /v1/library-items/:id/analysis?type=UPLOAD
        try {
          const res: any = await globalApiClient.get(`/v1/library-items/${id}/analysis?type=UPLOAD`);
          if (res && (res.markdown || res.content)) {
            setAnalysis({ markdown: res.markdown || res.content, updatedAt: res.updatedAt });
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

  const refreshAnalysis = useCallback(async () => {
    try {
      const res: any = await globalApiClient.get(`/v1/library-items/${id}/analysis?type=UPLOAD`);
      if (res && (res.markdown || res.content)) {
        setAnalysis({ markdown: res.markdown || res.content, updatedAt: res.updatedAt });
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
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>{upload.title}</h1>
      <div style={{ marginBottom: 16, color: '#666', display: 'flex', alignItems: 'center' }}>
        <a href={upload.url} target="_blank" rel="noreferrer">원본 파일 열기</a>
        {upload.createdAt && (
          <span style={{ marginLeft: 12 }}>
            {new Date(upload.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button onClick={refreshAnalysis} style={{ marginLeft: 'auto', padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>새로고침</button>
      </div>
      {upload.description && (
        <div style={{ marginBottom: 16, color: '#333' }}>{upload.description}</div>
      )}

      {analysis ? (
        <MarkdownRenderer content={analysis.markdown} />
      ) : (
        <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6, color: '#333' }}>
          아직 분석 결과가 없습니다. 처리 완료 후 이곳에 요약/분석 마크다운이 표시됩니다.
        </div>
      )}
    </div>
  );
};

export default UploadView;
