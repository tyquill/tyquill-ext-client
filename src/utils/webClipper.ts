/**
 * Web Clipper Utility
 * 
 * @description Obsidian Clipper 스타일의 웹 페이지 스크랩 기능
 * turndown을 사용하여 HTML을 Markdown으로 변환
 */

import TurndownService from 'turndown';

export interface PageMetadata {
  title: string;
  url: string;
  author?: string;
  publishedDate?: string;
  description?: string;
  siteName?: string;
  favicon?: string;
}

export interface ScrapResult {
  content: string;
  metadata: PageMetadata;
  selectionOnly: boolean;
  timestamp: string;
}

export interface ClipperOptions {
  includeMetadata: boolean;
  preserveImages: boolean;
  preserveLinks: boolean;
  cleanHtml: boolean;
  selectionOnly: boolean;
}

export class WebClipper {
  private turndownService: TurndownService;
  private options: ClipperOptions;

  constructor(options: Partial<ClipperOptions> = {}) {
    this.options = {
      includeMetadata: true,
      preserveImages: true,
      preserveLinks: true,
      cleanHtml: true,
      selectionOnly: false,
      ...options,
    };

    // Turndown 설정
    this.turndownService = new TurndownService({
      headingStyle: 'atx', // # 스타일 헤딩
      codeBlockStyle: 'fenced', // ``` 코드 블록
      emDelimiter: '*', // 이탤릭
      strongDelimiter: '**', // 볼드
      linkStyle: 'inlined', // [text](url) 스타일
      linkReferenceStyle: 'full',
    });

    this.configureTurndown();
  }

  /**
   * 현재 페이지 스크랩
   */
  async clipPage(options?: Partial<ClipperOptions>): Promise<ScrapResult> {
    const finalOptions = { ...this.options, ...options };
    
    // 선택된 텍스트가 있는지 확인
    const selection = window.getSelection();
    const hasSelection = selection && !selection.isCollapsed;
    
    let content: string;
    let selectionOnly = false;

    if (hasSelection && finalOptions.selectionOnly) {
      // 선택된 부분만 스크랩
      content = this.clipSelection(selection);
      selectionOnly = true;
    } else {
      // 전체 페이지 또는 주요 콘텐츠 영역 스크랩
      content = this.clipMainContent();
      selectionOnly = false;
    }

    const metadata = this.extractMetadata();
    
    // 메타데이터 헤더 추가
    let finalContent = content;
    if (finalOptions.includeMetadata) {
      finalContent = this.generateMetadataHeader(metadata) + '\n\n---\n\n' + content;
    }

    return {
      content: finalContent,
      metadata,
      selectionOnly,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 선택된 텍스트 스크랩
   */
  private clipSelection(selection: Selection): string {
    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    
    return this.convertToMarkdown(container);
  }

  /**
   * 주요 콘텐츠 영역 스크랩
   */
  private clipMainContent(): string {
    const mainContent = this.detectMainContent();
    
    if (mainContent) {
      return this.convertToMarkdown(mainContent);
    }
    
    // 대체: body에서 불필요한 요소 제거 후 변환
    const cleanedBody = this.getCleanedBody();
    return this.convertToMarkdown(cleanedBody);
  }

  /**
   * HTML을 Markdown으로 변환
   */
  private convertToMarkdown(element: Element): string {
    let html = element.innerHTML;
    
    if (this.options.cleanHtml) {
      html = this.cleanHtml(html);
    }
    
    return this.turndownService.turndown(html);
  }

  /**
   * 주요 콘텐츠 영역 감지
   */
  private detectMainContent(): Element | null {
    // 우선순위에 따른 셀렉터
    const contentSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      '#content',
      '.main-content',
      '.post-body',
      '.article-body',
      '.markdown-body', // GitHub 등
      '.post', // 블로그
      '.story-body', // 뉴스
      // CMS/빌더/메일 본문 컨테이너들
      '.et_pb_post_content', // Divi (WordPress)
      '.mail_view_contents_inner', // NAVER Mail 본문
      '.mail_view_contents',
      '[itemprop="articleBody"]',
      '[data-article-body]'
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && this.hasSubstantialContent(element)) {
        return element;
      }
    }

    // 대체: 가장 많은 텍스트를 포함한 요소 찾기
    return this.findLargestTextContainer();
  }

  /**
   * 요소가 실질적인 콘텐츠를 포함하는지 확인
   */
  private hasSubstantialContent(element: Element): boolean {
    const text = element.textContent?.trim() || '';
    const wordCount = text.split(/\s+/).length;
    
    // 포함 우선: 링크 밀도는 점수에서 페널티 처리하므로 여기서는 배제하지 않음
    return wordCount > 50 && !this.isNavigationElement(element);
  }

  /**
   * 네비게이션 요소인지 확인
   */
  private isNavigationElement(element: Element): boolean {
    const className = element.className.toLowerCase();
    const tagName = element.tagName.toLowerCase();
    
    const navKeywords = ['nav', 'menu', 'sidebar', 'header', 'footer', 'aside', 'gnb', 'lnb', 'breadcrumb'];
    
    return navKeywords.some(keyword => 
      className.includes(keyword) || 
      tagName === keyword ||
      element.getAttribute('role') === keyword
    );
  }

  /**
   * 가장 큰 텍스트 컨테이너 찾기
   */
  private findLargestTextContainer(): Element | null {
    const candidates = Array.from(document.querySelectorAll('div, section, article, main'));
    let maxScore = 0;
    let bestElement: Element | null = null;

    for (const element of candidates) {
      const score = this.calculateContentScore(element);
      if (score > maxScore) {
        maxScore = score;
        bestElement = element;
      }
    }

    return bestElement;
  }

  /**
   * 콘텐츠 점수 계산
   */
  private calculateContentScore(element: Element): number {
    const text = element.textContent?.trim() || '';
    const wordCount = text.split(/\s+/).length;
    const paragraphs = element.querySelectorAll('p').length;
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    const links = element.querySelectorAll('a').length;
    const linkDensity = paragraphs > 0 ? links / Math.max(paragraphs, 1) : (links > 0 ? links : 0);

    // 기본 점수 (문단 가중치 상향)
    let score = wordCount + (paragraphs * 15) + (headings * 5);

    // 본문 힌트 보너스
    if (this.matchesContentHint(element)) {
      score += 300;
    }

    // 네비게이션 요소면 큰 감점
    if (this.isNavigationElement(element)) {
      score *= 0.2;
    }

    // 링크 밀도 페널티
    if (linkDensity > 0) {
      score = score / (1 + Math.min(linkDensity, 5));
    }

    return score;
  }

  /**
   * 본문 컨테이너 힌트 매칭
   */
  private matchesContentHint(element: Element): boolean {
    const el = element as HTMLElement;
    const cls = `${el.className || ''}`.toLowerCase();
    const id = `${el.id || ''}`.toLowerCase();
    const hints = [
      'article', 'content', 'post', 'entry', 'markdown-body',
      'et_pb_post_content', 'mail_view_contents_inner', 'mail_view_contents',
    ];
    return hints.some(h => cls.includes(h) || id.includes(h));
  }

  /**
   * body에서 정리된 내용 가져오기
   */
  private getCleanedBody(): Element {
    const body = document.body.cloneNode(true) as Element;
    
    // 불필요한 요소들 제거
    const unwantedSelectors = [
      'script',
      'style',
      'noscript',
      'nav',
      'header',
      'footer',
      'aside',
      '.navigation',
      '.menu',
      '.sidebar',
      '.ads',
      '.advertisement',
      '.social-share',
      '.comments',
      '.related-posts',
      // 쿠키/배너/모달/팝업/툴팁 등 비-본문 공통 요소
      '[role="dialog"]',
      '.modal',
      '.popup',
      '.popover',
      '.tooltip',
      '[data-nosnippet]',
      '[aria-hidden="true"]',
      // 컨센트/쿠키 배너 패턴
      '[class*="cookie"]',
      '[id*="cookie"]',
      '[class*="consent"]',
      '[id*="consent"]',
      '.osano-cm-window',
      // 글로벌 네비게이션/헤더
      '#gnb',
      '#pc_header',
      '.gnb',
      '.lnb',
      // 기타 본문 외 위젯/배너
      '[class*="subscribe"]',
      '[class*="newsletter"]',
      '[class*="signup"]',
      '[class*="share"]',
      '[class*="breadcrumb"]'
    ];

    unwantedSelectors.forEach(selector => {
      const elements = body.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    // 폼/컨트롤 요소 제거 (일반적 관례상 본문 제외)
    body.querySelectorAll('form, button, input, select, textarea, label').forEach(el => el.remove());

    // 숨김 요소 제거
    body.querySelectorAll('[hidden], [style*="display:none"], [style*="visibility:hidden"]').forEach(el => el.remove());

    return body;
  }

  /**
   * HTML 정리
   */
  private cleanHtml(html: string): string {
    return html
      // 스크립트와 스타일 제거
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // 주석 제거
      .replace(/<!--[\s\S]*?-->/g, '')
      // 불필요한 속성 제거
      .replace(/\s*(class|id|style|onclick|onload)="[^"]*"/g, '')
      .replace(/\s*aria-[a-z\-]+="[^"]*"/gi, '')
      .replace(/\s*data-[a-z\-]+="[^"]*"/gi, '')
      // 빈 요소 제거
      .replace(/<(\w+)[^>]*>\s*<\/\1>/g, '');
  }

  /**
   * 페이지 메타데이터 추출
   */
  private extractMetadata(): PageMetadata {
    const title = document.title || 
                  document.querySelector('h1')?.textContent?.trim() || 
                  'Untitled';

    const url = window.location.href;

    // Open Graph 메타 태그 우선
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
    const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');

    // 일반 메타 태그
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
    const metaAuthor = document.querySelector('meta[name="author"]')?.getAttribute('content');

    // 구조화된 데이터에서 작성자 찾기
    const authorElement = document.querySelector('[rel="author"], .author, .byline, [itemprop="author"]');
    const author = metaAuthor || authorElement?.textContent?.trim();

    // 게시일 찾기
    const timeElement = document.querySelector('time[datetime], [itemprop="datePublished"]');
    const publishedDate = timeElement?.getAttribute('datetime') || 
                         timeElement?.textContent?.trim();

    // 파비콘
    const faviconElement = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    const favicon = faviconElement?.getAttribute('href');

    return {
      title: ogTitle || title,
      url,
      author: author || undefined,
      publishedDate: publishedDate ? new Date(publishedDate).toLocaleDateString('ko-KR') : undefined,
      description: ogDescription || metaDescription || undefined,
      siteName: ogSiteName || window.location.hostname,
      favicon: favicon ? new URL(favicon, window.location.origin).href : undefined,
    };
  }

  /**
   * 메타데이터 헤더 생성
   */
  private generateMetadataHeader(metadata: PageMetadata): string {
    let header = `# ${metadata.title}\n\n`;
    
    if (metadata.author) {
      header += `**작성자**: ${metadata.author}\n`;
    }
    
    if (metadata.publishedDate) {
      header += `**게시일**: ${metadata.publishedDate}\n`;
    }
    
    if (metadata.description) {
      header += `**요약**: ${metadata.description}\n`;
    }
    
    header += `**출처**: [${metadata.siteName}](${metadata.url})\n`;
    header += `**스크랩 일시**: ${new Date().toLocaleString('ko-KR')}\n`;
    
    return header;
  }

  /**
   * Turndown 설정
   */
  private configureTurndown(): void {
    // 이미지 처리
    if (!this.options.preserveImages) {
      this.turndownService.addRule('removeImages', {
        filter: 'img',
        replacement: () => '',
      });
    }

    // 링크 처리
    if (!this.options.preserveLinks) {
      this.turndownService.addRule('removeLinks', {
        filter: 'a',
        replacement: (content) => content,
      });
    }

    // 불필요한 요소 제거
    this.turndownService.addRule('removeUnwanted', {
      filter: ['script', 'style', 'noscript', 'iframe', 'embed', 'form', 'button', 'input', 'select', 'textarea', 'label'],
      replacement: () => '',
    });

    // UI 전용 컨테이너 제거 (쿠키/팝업/공유/브레드크럼 등)
    this.turndownService.addRule('removeUiOnly', {
      filter: (node: any) => {
        if (!node || (node as any).nodeType !== 1) return false;
        const el = node as HTMLElement;
        const cls = `${el.className || ''}`.toLowerCase();
        const id = `${el.id || ''}`.toLowerCase();
        const uiHints = ['cookie', 'consent', 'popup', 'modal', 'tooltip', 'popover', 'share', 'breadcrumb', 'gnb', 'lnb'];
        return uiHints.some(k => cls.includes(k) || id.includes(k));
      },
      replacement: () => ''
    });

    // 코드 블록 개선
    this.turndownService.addRule('improvedCodeBlock', {
      filter: function (node: any) {
        return node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
      },
      replacement: function (content: any, node: any) {
        const firstChild = node.firstChild as HTMLElement;
        const language = firstChild?.className?.match(/language-(\w+)/)?.[1] || '';
        return `\n\`\`\`${language}\n${firstChild?.textContent}\n\`\`\`\n\n`;
      },
    });
  }
}

// 전역 유틸리티 함수들
export const webClipper = new WebClipper();

/**
 * 빠른 스크랩 (기본 설정)
 */
export async function quickClip(): Promise<ScrapResult> {
  return webClipper.clipPage();
}

/**
 * 선택 영역 스크랩
 */
export async function clipSelection(): Promise<ScrapResult> {
  return webClipper.clipPage({ selectionOnly: true });
}

/**
 * 최소한의 메타데이터로 스크랩
 */
export async function clipMinimal(): Promise<ScrapResult> {
  return webClipper.clipPage({ 
    includeMetadata: false,
    preserveImages: false,
  });
}