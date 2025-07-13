/**
 * Represents the different page types available in the application's navigation
 * @type {string}
 * @property {'landing'} landing - Initial landing/welcome page
 * @property {'scrap'} scrap - Page for managing scrapped content
 * @property {'template'} template - Page for managing templates
 * @property {'draft'} draft - Page for managing draft content
 * @property {'archive'} archive - Page displaying list of archived drafts
 * @property {'archive-detail'} archive-detail - Detailed view of an archived draft with version history
 */
export type PageType = 'landing' | 'scrap' | 'template' | 'draft' | 'archive' | 'archive-detail';
