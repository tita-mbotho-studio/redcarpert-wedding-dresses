import type { DocumentNode, SiteDocumentData } from "../types/site.ts";

type EmphasisRule = {
  route: string;
  tag: "h2" | "p";
  text: string;
  phrase: string;
  id?: string;
  className?: string;
  heading?: boolean;
};

// Exact, approved copy only. Never perform a global search-and-replace on
// customer data, links, pricing, scripts, attributes or accessibility labels.
const rules: readonly EmphasisRule[] = [
  { route: "/", tag: "h2", className: "section-title", text: "Redcarpert Wedding Dresses", phrase: "Wedding Dresses", heading: true },
  { route: "/", tag: "p", text: "TIMELESS ELEGANCE FOR YOUR DREAM WEDDING", phrase: "YOUR DREAM WEDDING" },
  { route: "/about-us", tag: "h2", id: "redcarpert-story-title", text: "Your Dream Dress Starts Here", phrase: "Dream Dress", heading: true },
  { route: "/about-us", tag: "p", text: "We celebrate brides of every shape and size. Our collections offer a wide range of sizes, including plus sizes, so every bride can find a gown that makes her feel beautiful, confident and comfortable.", phrase: "plus sizes" },
  { route: "/contact-us", tag: "h2", id: "redcarpert-contact-title", text: "Let's find your wedding dress", phrase: "wedding dress", heading: true },
  { route: "/contact-us", tag: "p", text: "Fittings are by appointment only. Please book your fitting on WhatsApp before visiting.", phrase: "by appointment only" },
  { route: "/wedding-moments", tag: "p", className: "redcarpert-moments-subtitle", text: "The love, the laughter, the unforgettable moments.", phrase: "unforgettable moments" },
  { route: "/digital-lookbook", tag: "p", className: "redcarpert-editorial-lead", text: "Explore Our Wedding Dress Collections", phrase: "Wedding Dress Collections" },
];

/** Preserve every character and existing block; add inline emphasis only. */
export function refineTextHierarchy(document: SiteDocumentData): SiteDocumentData {
  const pageRules = rules.filter(rule => rule.route === document.route);
  if (!pageRules.length) return document;
  const visit = (nodes: DocumentNode[]): DocumentNode[] => {
    let changed = false;
    const result = nodes.map((node): DocumentNode => {
      if (typeof node === "string") return node;
      if (["script", "style", "noscript", "a", "button", "label", "textarea", "select", "header", "footer", "nav"].includes(node.tag)) return node;
      const rule = pageRules.find(r => node.tag === r.tag
        && (!r.id || node.attrs.id === r.id)
        && (!r.className || node.attrs.class?.split(/\s+/).includes(r.className))
        && node.children.length === 1 && node.children[0] === r.text);
      if (rule) {
        const index = rule.text.indexOf(rule.phrase);
        if (index < 0) return node;
        const before = rule.text.slice(0, index);
        const after = rule.text.slice(index + rule.phrase.length);
        const children: DocumentNode[] = [
          ...(before ? [before] : []),
          { tag: rule.heading ? "span" : "strong",
            attrs: { class: rule.heading ? "redcarpert-heading-emphasis" : "redcarpert-text-emphasis" },
            children: [rule.phrase] },
          ...(after ? [after] : []),
        ];
        changed = true;
        return { ...node, children };
      }
      const children = visit(node.children);
      if (children === node.children) return node;
      changed = true;
      return { ...node, children };
    });
    return changed ? result : nodes;
  };
  const nodes = visit(document.nodes);
  return nodes === document.nodes ? document : { ...document, nodes };
}
