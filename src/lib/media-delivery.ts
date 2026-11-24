/**
 * Site-wide, context-aware media delivery.
 *
 * Original uploaded URLs always remain the source of truth in JSON and gallery
 * metadata. Only trusted image CDNs are transformed; local assets, unknown
 * hosts, videos and already-transformed ImageKit URLs are left alone.
 *
 * Add future photos to existing manifests: call mediaDeliveryUrl(source, preset)
 * when constructing HTML, or let the shared HTML renderer handle ordinary imgs.
 */
export type MediaImagePreset =
  | "tile" | "card" | "detail" | "preview" | "lookbook" | "team" | "hero";

const presets: Record<MediaImagePreset, { width: number; height: number; quality: number }> = {
  tile:     { width: 640,  height: 640,  quality: 90 },
  card:     { width: 740,  height: 740,  quality: 90 },
  detail:   { width: 1280, height: 1800, quality: 92 },
  preview:  { width: 1920, height: 1920, quality: 95 },
  lookbook: { width: 1200, height: 1600, quality: 92 },
  team:     { width: 900,  height: 1200, quality: 90 },
  hero:     { width: 2000, height: 2000, quality: 92 },
};

// Restrict variant widths to a finite cache-friendly set. Grid widths refer
// to the actual square tile or the width of the aspect-preserving card photo.
const responsiveWidths = [320, 480, 640, 960, 1280] as const;
const tileSizes = "(max-width: 768px) 46vw, (max-width: 1200px) 23vw, 300px";
const cardSizes = "(max-width: 640px) 46vw, (max-width: 1000px) 31vw, (max-width: 1200px) 23vw, 300px";
const relatedSizes = "(max-width: 1000px) 46vw, (max-width: 1200px) 23vw, 300px";

export function mediaDeliveryUrl(source: string, preset: MediaImagePreset, width?: number): string {
  // The homepage and intentional enlargement always use original files.
  if (preset === "hero" || preset === "preview") return source;
  if (typeof source !== "string" || !source.startsWith("https://")) return source;
  let url: URL;
  try { url = new URL(source); }
  catch { return source; }
  if (url.username || url.password || url.protocol !== "https:") return source;
  const config = presets[preset];
  if (!config) return source;

  // Never resize actual MP4/WebM or SVG media.
  if (/\.(?:mp4|webm|svg)$/i.test(url.pathname)) return source;
  if (url.hostname === "ik.imagekit.io") {
    if (url.searchParams.has("tr") || url.pathname.startsWith("/tr:")) return source;
    const responsive = preset === "tile" || preset === "card";
    const target = responsive && width !== undefined && responsiveWidths.some(n => n === width)
      ? width : config.width;
    // Match the actual existing center crop on Wedding Moments. Crop only
    // grid derivatives, never the original, detail photo or enlarged preview.
    // Catalogue images use a width-only resize so their approved 25% vertical
    // CSS focus (and related-card center focus) remain unchanged.
    const transform = preset === "tile"
      ? `w-${target},h-${target},c-maintain_ratio,fo-center,q-${config.quality},f-auto`
      : preset === "card"
      ? `w-${target},q-${config.quality},f-auto`
      : `w-${config.width},h-${config.height},c-at_max,q-${config.quality},f-auto`;
    const marker = source.indexOf("#");
    const beforeFragment = marker === -1 ? source : source.slice(0,marker);
    const fragment = marker === -1 ? "" : source.slice(marker);
    return beforeFragment + (url.search ? "&" : "?") + "tr=" + transform + fragment;
  }

  return source;
}

/** Exact width descriptors for responsive grid candidates. A fixed fallback
 * remains available; pre-transformed, unknown-host and local URLs stay intact. */
export function mediaResponsiveVariants(source: string, preset: MediaImagePreset): {url:string; width:number}[] {
  if (preset !== "tile" && preset !== "card") return [];
  if (mediaDeliveryUrl(source,preset) === source) return [];
  return responsiveWidths.map(width => ({url:mediaDeliveryUrl(source,preset,width),width}));
}

export function mediaResponsiveAttrs(source: string, preset: MediaImagePreset, related = false): Record<string,string> {
  const variants=mediaResponsiveVariants(source,preset);
  return {
    src:mediaDeliveryUrl(source,preset),
    ...(variants.length ? {
      srcset:variants.map(item=>item.url+" "+item.width+"w").join(", "),
      sizes:preset==="tile"?tileSizes:related?relatedSizes:cardSizes,
    } : {}),
  };
}

/** Common policy for generated HTML, including newly added image elements. */
export function mediaImageAttrs(
  attrs: Readonly<Record<string, string>>,
): Record<string, string> {
  if (!attrs.src || attrs["data-media-skip"] === "true") return { ...attrs };
  const cls = attrs.class ?? "";
  const requested = attrs["data-media-preset"];
  const preset: MediaImagePreset = requested && Object.prototype.hasOwnProperty.call(presets, requested)
    ? requested as MediaImagePreset
    : Object.prototype.hasOwnProperty.call(attrs,"data-gallery-active-image") ? "detail"
    : /(?:woocommerce_thumbnail|redcarpert-catalogue)/.test(cls) ? "card"
    : "team";
  const optimized = mediaDeliveryUrl(attrs.src,preset);
  const out = { ...attrs };
  if (optimized !== attrs.src) {
    out["data-media-original"] = attrs.src;
    // Replace inherited candidates rather than letting them bypass the
    // approved optimization. Detail galleries remain on a consistent URL
    // shared by their first image and adjacent-image preloader.
    delete out.srcset;
    delete out.sizes;
    Object.assign(out,mediaResponsiveAttrs(attrs.src,preset,
      requested === "card" && !/(?:woocommerce_thumbnail|redcarpert-catalogue)/.test(cls)));
  }
  if (/^https:\/\//.test(attrs.src)) {
    if (!out.decoding) out.decoding = "async";
    if (!out.loading) out.loading = out.fetchpriority === "high" ||
      Object.prototype.hasOwnProperty.call(out,"data-gallery-active-image")
      ? "eager" : "lazy";
  }
  return out;
}

/** Native videos never download ahead of a real click; optional poster images
 * share the small thumbnail policy and preserve their original URL. */
export function mediaVideoAttrs(
  attrs: Readonly<Record<string,string>>,
): Record<string,string> {
  const out = {...attrs};
  if (!out.preload && !Object.prototype.hasOwnProperty.call(out,"autoplay"))
    out.preload = "none";
  if (out.poster) {
    const optimized = mediaDeliveryUrl(out.poster,"tile");
    if (optimized !== out.poster) {
      out["data-media-poster-original"] = out.poster;
      out.poster = optimized;
    }
  }
  return out;
}
