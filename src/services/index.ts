/**
 * Services Index
 * 
 * @description 모든 서비스 클래스와 인스턴스 export
 */

// Base API Service
export * from './apiService';

// Auth Service
export * from './auth.service';

// Article Service
export { ArticleService, articleService } from './articleService';
export type { 
    CreateArticleDto, 
    GenerateArticleDto, 
    UpdateArticleDto, 
    ArticleResponse,
    ScrapWithOptionalComment 
} from './articleService';

// Article Archive Service
export { ArticleArchiveService, articleArchiveService } from './articleArchiveService';
export type {
    CreateArticleArchiveDto,
    UpdateArticleArchiveDto,
    ArticleArchiveResponse
} from './articleArchiveService';

// Scrap Service
export { ScrapService, scrapService } from './scrapService';
export type {
    CreateScrapDto,
    ScrapResponse
} from './scrapService';

// Tag Service
export { TagService, tagService } from './tagService';
export type {
    CreateTagDto,
    UpdateTagDto,
    TagResponse
} from './tagService';