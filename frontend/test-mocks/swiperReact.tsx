// Jest stand-in for the ESM-only "swiper/react" package (see jest.config.js
// moduleNameMapper). Swiper ships as .mjs with no CJS build, which Jest's
// default node_modules transform-skip can't parse. These components only
// need to render their children for component tests — the real carousel
// behaviour (autoplay, touch/drag, pagination) is Swiper's own concern, not
// this app's, so it isn't reproduced here.
import type { ReactNode } from "react";

export function Swiper({ children }: { children?: ReactNode; [key: string]: unknown }) {
  return <div data-testid="swiper-mock">{children}</div>;
}

export function SwiperSlide({ children }: { children?: ReactNode; [key: string]: unknown }) {
  return <div data-testid="swiper-slide-mock">{children}</div>;
}
