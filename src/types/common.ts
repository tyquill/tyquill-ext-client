/**
 * 공통 데이터 타입 정의
 */

export interface DraftVersion {
  version: number;
  content: string;
  date: string;
}

export interface Draft {
  id: string;
  title: string;
  versions: DraftVersion[];
  lastModified: string;
}
