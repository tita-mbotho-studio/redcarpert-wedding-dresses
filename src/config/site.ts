/** Default local and legacy Pages path; production uses the configured Pages URL. */
export const REPOSITORY_BASE = process.env.REDCARPERT_SITE_BASE === '/' ? '/' : '/redcarpert-wedding-dresses/';
export const PUBLIC_SITE_ORIGIN = process.env.REDCARPERT_SITE_ORIGIN || 'https://tita-mbotho-studio.github.io';
export const PUBLIC_SITE_URL = new URL(REPOSITORY_BASE, PUBLIC_SITE_ORIGIN).toString();
