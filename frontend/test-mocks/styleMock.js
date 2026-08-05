// Jest stand-in for CSS-only imports that don't end in a literal .css/.scss
// extension in the source (e.g. "swiper/css", "swiper/css/pagination" —
// exports-map subpaths), so next/jest's own `\.(css|sass|scss)$` moduleNameMapper
// never matches the raw specifier and needs an explicit redirect instead.
module.exports = {};
