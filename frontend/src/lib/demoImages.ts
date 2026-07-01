/** Fallback demo photos when DB image is missing — matches backend Unsplash seeds. */
const u = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const PRODUCT: Record<string, string> = {
  "phone-case-premium": u("1523275335684-37898b6baf30", 800, 1000),
  "fast-charger-65w": u("1608043152269-423dbba4e7e1", 800, 1000),
  "earbuds-tws-pro": u("1618005182384-a83a8bd57fbe", 800, 1000),
  "power-bank-20000": u("1633356122544-f134324a6cee", 800, 1000),
  "glass-protector": u("1511707171634-5f897ff02aa9", 800, 1000),
  "type-c-cable-3m": u("1542291026-7eec264c27ff", 800, 1000),
  "car-holder-magnetic": u("1558618666-fcd25c85cd64", 800, 1000),
  "bt-speaker-waterproof": u("1608043152269-423dbba4e7e1", 800, 1000),
};

const SERVICE: Record<string, string> = {
  printing: u("1618005182384-a83a8bd57fbe", 1920, 1080),
  legal: u("1554224155-6726b3ff858f", 1920, 1080),
  software: u("1498050108023-c5249f4df085", 1920, 1080),
  "web-design": u("1547658719-da2b51169166", 1920, 1080),
  "mobile-app": u("1504384308090-c894fdcc538d", 1920, 1080),
  "digital-marketing": u("1460925895917-afdab827c52f", 1920, 1080),
};

export const DEMO_PRODUCT = u("1523275335684-37898b6baf30", 800, 1000);
export const DEMO_SERVICE = u("1454165804606-c3d57bc86b40", 1920, 1080);
export const DEMO_REVIEW = u("1507003211169-0a1dd7228f2d", 256, 256);
export const DEMO_BLOG = u("1498050108023-c5249f4df085", 1920, 1080);
export const DEMO_PROJECT = u("1460925895917-afdab827c52f", 1280, 720);

export function resolveProductImage(url?: string | null, slug?: string): string {
  if (url?.trim()) return url;
  return (slug && PRODUCT[slug]) || DEMO_PRODUCT;
}

export function resolveServiceImage(url?: string | null, slug?: string): string {
  if (url?.trim()) return url;
  return (slug && SERVICE[slug]) || DEMO_SERVICE;
}

export function resolveReviewPhoto(url?: string | null): string {
  if (url?.trim()) return url;
  return DEMO_REVIEW;
}

export function resolveBlogImage(url?: string | null): string {
  if (url?.trim()) return url;
  return DEMO_BLOG;
}

export function resolveProjectImage(url?: string | null): string {
  if (url?.trim()) return url;
  return DEMO_PROJECT;
}
