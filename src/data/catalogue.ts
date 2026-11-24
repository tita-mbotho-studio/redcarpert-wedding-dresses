import clientModernTraditionDresses from "./client-modern-tradition-dresses.json" with { type: "json" };
import clientMermaidDresses from "./client-mermaid-dresses.json" with { type: "json" };
import clientBallGowns from "./client-ball-gowns.json" with { type: "json" };
import clientTwoInOneDresses from "./client-two-in-one-dresses.json" with { type: "json" };
import clientRuffledDresses from "./client-ruffled-dresses.json" with { type: "json" };
import { priceForDress, type PriceZar } from "../lib/pricing.ts";

/** Catalogue records retain image provenance internally for asset replacement and licensing. */
export type DressCategory = "mermaid" | "ball_gown" | "ruffled" | "modern_tradition" | "two_in_one";
export interface CatalogueProduct {
  readonly id: string;
  readonly name: string;
  readonly category: DressCategory;
  /** A dress belongs to exactly one displayed collection. */
  readonly collections: readonly DressCategory[];
  readonly priceZar: PriceZar;
  readonly image: string;
  readonly imageAlt: string;
  /** Optional client-supplied dress video; PDF and printed book retain the primary photograph. */
  readonly videos?: readonly { readonly url: string; readonly alt: string }[];
  readonly detailReference: null;
  readonly previewRoute: `/product/preview/${string}`;
  readonly imageCredit: { readonly photographer: string; readonly sourceUrl: string; readonly provenance: string };
}
export const catalogueCategories = [
  { id: "mermaid", name: "Mermaid", route: "/product-category/mermaid/" },
  { id: "ball_gown", name: "Ball Gown", route: "/product-category/ball_gown/" },
  { id: "ruffled", name: "Ruffled Dresses", route: "/product-category/ruffled/" },
  { id: "modern_tradition", name: "Modern Tradition Dresses", route: "/product-category/modern_tradition/" },
  { id: "two_in_one", name: "2 in 1 Dresses", route: "/product-category/two_in_one/" },
] as const;

export function collectionsForDress(id: string, primary: DressCategory): readonly DressCategory[] {
  if (!id.trim()) throw new Error("Cannot assign a collection to a dress without an ID");
  return [primary];
}
export function dressAppearsInCollection(product: CatalogueProduct, category: DressCategory): boolean {
  return product.collections.includes(category);
}

/** Category is determined by the client’s current collection: Modern Tradition includes colourful gowns regardless of silhouette. */
/** Primary photographs for all client dress groups come from their CSV imports. */
const sourceCatalogueProducts: readonly CatalogueProduct[] = [
  ...clientMermaidDresses.map(dress => ({
    id: dress.id, name: dress.name, category: "mermaid" as const,
    collections: collectionsForDress(dress.id,"mermaid"),
    priceZar: priceForDress(dress.id),
    image: dress.photos[0].url,
    imageAlt: dress.photos[0].alt,
    detailReference: null,
    previewRoute: `/product/preview/${dress.id}` as const,
    imageCredit: {photographer:"Client supplied",sourceUrl:dress.photos[0].url,provenance:"client-supplied"},
  })),
  ...clientBallGowns.map(gown => ({
    id: gown.id,
    name: gown.name,
    category: "ball_gown" as const,
    collections: collectionsForDress(gown.id,"ball_gown"),
    priceZar: priceForDress(gown.id),
    image: gown.photos[0].url,
    imageAlt: gown.photos[0].alt,
    detailReference: null,
    previewRoute: `/product/preview/${gown.id}` as const,
    imageCredit: { photographer: "Client supplied", sourceUrl: gown.photos[0].url, provenance: "client-supplied" },
  })),
  ...clientRuffledDresses.map(dress => ({
    id: dress.id,
    name: dress.name,
    category: "ruffled" as const,
    collections: collectionsForDress(dress.id,"ruffled"),
    priceZar: priceForDress(dress.id),
    image: dress.photos[0].url,
    imageAlt: dress.photos[0].alt,
    detailReference: null,
    previewRoute: `/product/preview/${dress.id}` as const,
    imageCredit: { photographer: "Client supplied", sourceUrl: dress.photos[0].url, provenance: "client-supplied" },
  })),
  ...clientModernTraditionDresses.map(dress => ({
    id: dress.id, name: dress.name, category: "modern_tradition" as const,
    collections: collectionsForDress(dress.id,"modern_tradition"),
    priceZar: priceForDress(dress.id),
    image: dress.photos[0].url,
    imageAlt: dress.photos[0].alt,
    videos: "videos" in dress ? dress.videos : [],
    detailReference: null,
    previewRoute: `/product/preview/${dress.id}` as const,
    imageCredit: {photographer:"Client supplied",sourceUrl:dress.photos[0].url,provenance:"client-supplied"},
  })),
  ...clientTwoInOneDresses.map(dress => ({
    id: dress.id, name: dress.name, category: "two_in_one" as const,
    collections: collectionsForDress(dress.id,"two_in_one"),
    priceZar: priceForDress(dress.id),
    image: dress.photos[0].url,
    imageAlt: dress.photos[0].alt,
    detailReference: null,
    previewRoute: `/product/preview/${dress.id}` as const,
    imageCredit: {photographer:"Client supplied",sourceUrl:dress.photos[0].url,provenance:"client-supplied"},
  })),

];

/** 2 Mermaid + 16 Ball Gown + 6 Ruffled + 6 Modern Tradition + 23 2 in 1. */
export const catalogueProducts: readonly CatalogueProduct[] = [
  ...sourceCatalogueProducts.filter(product=>product.category!=="two_in_one"),
  ...sourceCatalogueProducts.filter(product=>product.category==="two_in_one"),
];
if(catalogueProducts.length!==53||new Set(catalogueProducts.map(product=>product.id)).size!==53)
  throw new Error("Catalogue requires exactly 53 distinct dress identities");
