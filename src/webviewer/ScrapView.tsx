import React, { useEffect, useState } from 'react';
import { scrapService } from '../services/scrapService';
import MarkdownRenderer from '../utils/markdownRenderer';
import { useI18n } from '../hooks/useI18n';
import styles from './ScrapView.module.css';
import { IoLinkOutline, IoTimeOutline } from 'react-icons/io5';

interface Props { id: number }

interface ScrapData {
  title: string;
  content: string;
  url: string;
  createdAt?: string;
}

const ScrapView: React.FC<Props> = ({ id }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrap, setScrap] = useState<ScrapData | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        const data = await scrapService.getScrapById(id);
        setScrap({ title: data.title, content: data.content, url: data.url, createdAt: data.createdAt });
      } catch (e: any) {
        setError(e?.message || 'Failed to load scrap.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const domain = (() => {
    try {
      if (!scrap?.url) return '';
      const hostname = new URL(scrap.url).hostname.replace(/^www\./, '');
      const parts = hostname.split('.');
      return parts.length >= 3 ? parts.slice(-2).join('.') : hostname;
    } catch {
      return '';
    }
  })();

  if (loading) return <div style={{ padding: 16 }}>{t('common_loading')}</div>;
  if (error) return <div style={{ padding: 16, color: 'red' }}>{error}</div>;
  if (!scrap) return <div style={{ padding: 16 }}>No data available.</div>;

  return (
    <div className={`${styles.pageBg} ${styles.themeLight}`}>
      <div className={styles.viewer}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.titleBlock}>
              <div className={styles.title}>{scrap.title}</div>
              <div className={styles.meta}>
                <span className={styles.pill}>
                  <span className={styles.pillIcon}><IoLinkOutline size={14} /></span>
                  <a className={styles.pillLink} href={scrap.url} target="_blank" rel="noreferrer">{domain || 'Original link'}</a>
                </span>
                {scrap.createdAt && (
                  <span className={styles.pill}>
                    <span className={styles.pillIcon}><IoTimeOutline size={14} /></span>
                    {new Date(scrap.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
            <div className={styles.actions}>
              <a className={`${styles.btn} ${styles.btnPrimary}`} href={scrap.url} target="_blank" rel="noreferrer">
                View Original
              </a>
            </div>
          </div>
          <div className={styles.content}>
            <MarkdownRenderer content={scrap.content} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrapView;

