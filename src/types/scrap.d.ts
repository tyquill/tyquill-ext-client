export interface Scrap {
  id: string;
  title: string;
  url: string;
  tags: string[];
  date: string;
  content: string;
  faviconUrl?: string;
  type?: 'webclip' | 'pdf' | 'image' | 'video' | 'audio' | 'upload'; // v3 API에서 type 구분
}
