import clientMermaidDresses from "../data/client-mermaid-dresses.json" with { type: "json" };
import clientBallGowns from "../data/client-ball-gowns.json" with { type: "json" };
import clientTwoInOneDresses from "../data/client-two-in-one-dresses.json" with { type: "json" };
import clientRuffledDresses from "../data/client-ruffled-dresses.json" with { type: "json" };
import clientModernTraditionDresses from "../data/client-modern-tradition-dresses.json" with { type: "json" };
import { catalogueProducts, type CatalogueProduct } from "../data/catalogue.ts";

export interface DressGalleryPhoto {
  readonly url: string;
  readonly alt: string;
}

/**
 * The catalogue photograph always comes first. Optional subsequent photos are
 * mapped by stable dress ID; do not show unrelated stock photos as dress angles.
 * Client gown galleries live in their category manifests; other photos may be
 * added to src/data/dress-gallery-images.json.
 */
export const additionalDressPhotos: Readonly<Record<string, readonly DressGalleryPhoto[]>> = {
  ...Object.fromEntries([...clientMermaidDresses, ...clientBallGowns,
    ...clientRuffledDresses, ...clientTwoInOneDresses, ...clientModernTraditionDresses]
    .map(dress => [dress.id, dress.photos.slice(1)])),
};

const approvedPhotoUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "ik.imagekit.io" &&
      !url.username && !url.password;
  } catch {
    return false;
  }
};

export function validateDressGalleryMappings(
  mappings: Readonly<Record<string, readonly DressGalleryPhoto[]>> = additionalDressPhotos,
): void {
  const known = new Set(catalogueProducts.map(product => product.id));
  for (const [productId, photos] of Object.entries(mappings)) {
    if (!known.has(productId)) throw new Error("Unrecognized dress gallery ID: " + productId);
    if (!Array.isArray(photos) || photos.length > 15) throw new Error("Invalid photo count for " + productId);
    const urls = new Set<string>();
    for (const photo of photos) {
      if (typeof photo?.url !== "string" || !approvedPhotoUrl(photo.url) ||
        typeof photo?.alt !== "string" || photo.alt.trim().length < 5 || photo.alt.length > 180) {
        throw new Error("Invalid gallery photo or alternative text for " + productId);
      }
      const product = catalogueProducts.find(item=>item.id===productId);
      if (product) {
        // Every gallery image must belong to the same client-uploaded dress
        // photo sequence as its catalogue cover, not merely the same category.
        const folder = {
          mermaid:'mermaid-dresses',ball_gown:'ball-gown-dresses',
          ruffled:'ruffled-dresses',two_in_one:'2-in-1-dresses',
          modern_tradition:'modern-tradition-dresses',
        }[product.category];
        const root = 'https://ik.imagekit.io/kw8awoqvwi/red-carpet-wedding-dresses/wedding-dresses/' + folder + '/';
        const primaryFile = product.image.split('?')[0].split('/').at(-1) ?? '';
        const base = primaryFile.replace(/-01[.]webp$/i,'');
        const file = photo.url.split('?')[0].split('/').at(-1) ?? '';
        const index = /^(.+)-([0-9]{2})[.]webp$/i.exec(file);
        if (!primaryFile.match(/-01[.]webp$/i) || !photo.url.toLowerCase().startsWith(root.toLowerCase()) ||
            !index || index[1].toLowerCase()!==base.toLowerCase() ||
            Number(index[2])<2 || Number(index[2])>99 ||
            !/^(?:|[?]updatedAt=\d{13})$/.test(photo.url.slice(photo.url.indexOf('?') < 0 ? photo.url.length : photo.url.indexOf('?')))) {
          throw new Error('Client gallery photograph belongs to a different dress: '+productId);
        }
      }
      if (urls.has(photo.url)) throw new Error("Repeated gallery photograph for " + productId);
      urls.add(photo.url);
    }
  }
}

export function photosForDress(
  product: CatalogueProduct,
  mappings: Readonly<Record<string, readonly DressGalleryPhoto[]>> = additionalDressPhotos,
): readonly DressGalleryPhoto[] {
  validateDressGalleryMappings(mappings);
  const sourceExtras = mappings[product.id] ?? [];
  if (sourceExtras.some(photo => photo.url === product.image)) throw new Error("Gallery duplicates the primary photograph for " + product.id);
  const extras = sourceExtras;
  return [{ url: product.image, alt: product.imageAlt }, ...extras];
}
