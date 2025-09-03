import React, { useEffect, useMemo, useState } from 'react';
import { scrapService } from '../services/scrapService';
import MarkdownRenderer from '../utils/markdownRenderer';

interface ScrapData {
  title: string;
  content: string;
  url: string;
  createdAt?: string;
}

const getScrapIdFromHash = (): string | null => {
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  return params.get('scrapId');
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrap, setScrap] = useState<ScrapData | null>(null);

  const scrapId = useMemo(() => getScrapIdFromHash(), []);

  useEffect(() => {
    const load = async () => {
      if (!scrapId) {
        setError('유효하지 않은 스크랩 ID');
        setLoading(false);
        return;
      }
      try {
        const data = await scrapService.getScrapById(parseInt(scrapId, 10));
        setScrap({ title: data.title, content: data.content, url: data.url, createdAt: data.createdAt });
      } catch (e: any) {
        setError(e?.message || '스크랩을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [scrapId]);

  if (loading) return <div style={{ padding: 16 }}>불러오는 중...</div>;
  if (error) return <div style={{ padding: 16, color: 'red' }}>{error}</div>;
  if (!scrap) return <div style={{ padding: 16 }}>데이터가 없습니다.</div>;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>{scrap.title}</h1>
      <div style={{ marginBottom: 16, color: '#666' }}>
        <a href={scrap.url} target="_blank" rel="noreferrer">원문 링크</a>
        {scrap.createdAt && (
          <span style={{ marginLeft: 12 }}>
            {new Date(scrap.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <MarkdownRenderer content={scrap.content} />
    </div>
  );
};

export default App;


