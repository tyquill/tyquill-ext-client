/**
 * Represents the different page types available in the application's navigation
 * @type {string}
 * @property {'landing'} landing - Initial landing/welcome page
 * @property {'content'} content - Unified page for managing scraps and articles with folder navigation
 * @property {'template'} template - Page for managing templates
 * @property {'draft'} draft - Page for managing draft content
 * @property {'archive-detail'} archive-detail - Detailed view of an archived draft with version history
 * @property {'style-management'} style-management - Page for managing writing styles
 */
export type PageType = 'landing' | 'content' | 'template' | 'draft' | 'archive-detail' | 'style-management';
