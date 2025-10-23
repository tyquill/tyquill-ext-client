import { ScrapResponse } from '../services/scrapService';

/**
 * Get the favicon URL from a scrap
 */
export const getScrapFaviconUrl = (scrap: ScrapResponse): string | null => {
  return scrap.webpage?.site?.favicon_url || scrap.faviconUrl || null;
};

/**
 * Get the domain from a scrap
 */
export const getScrapDomain = (scrap: ScrapResponse): string => {
  if (scrap.webpage?.site?.host) {
    return scrap.webpage.site.host;
  }
  try {
    return new URL(scrap.url).hostname;
  } catch {
    return '';
  }
};

/**
 * Format a date string to relative time (e.g., "5 minutes ago", "2 days ago")
 */
export const formatRelativeTime = (
  dateString: string,
  t: (key: any) => string
): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}${t('articleGenerate_minutes')} ${t('common_ago')}`;
  }
  if (diffHours < 24) {
    return `${diffHours}${t('common_hoursAgo')}`;
  }
  if (diffDays < 7) {
    return `${diffDays}${t('common_daysAgo')}`;
  }
  return date.toLocaleDateString();
};
