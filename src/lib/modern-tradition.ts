import { catalogueProducts, type CatalogueProduct } from "../data/catalogue.ts";

/** Modern Tradition products with independent catalogue IDs and their own client media. */
export interface ModernTraditionPage {
  readonly product: CatalogueProduct;
  readonly number: string;
  readonly name: string;
  readonly route: `/product/preview/modern-tradition-${string}`;
}

/** Stable, contiguous numbers for the approved Modern Tradition selection. */
export const modernTraditionPages: readonly ModernTraditionPage[] = catalogueProducts
  .filter(product => product.category === "modern_tradition")
  .map((product, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      product,
      number,
      name: product.name,
      route: `/product/preview/modern-tradition-${number}` as const,
    };
  });

if (modernTraditionPages.length !== 6 ||
    new Set(modernTraditionPages.map(page => page.product.id)).size !== 6 ||
    new Set(modernTraditionPages.map(page => page.route)).size !== 6) {
  throw new Error("Modern Tradition must have exactly six unique client dresses");
}

export function modernTraditionPageForDress(id: string): ModernTraditionPage | undefined {
  return modernTraditionPages.find(page => page.product.id === id);
}

export function modernTraditionPageForRoute(route: string): ModernTraditionPage | undefined {
  return modernTraditionPages.find(page => page.route === route);
}
