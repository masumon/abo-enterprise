/** Shared modal backdrop/panel styles. Panel surfaces are CSS-driven so the
 * Admin Panel theme applies consistently to route-local overlays and dialogs. */
export const ADMIN_MODAL_BACKDROP_STYLE = {
  background: "rgba(0,0,0,0.5)",
  backdropFilter: "blur(4px)",
} as const;

export const ADMIN_MODAL_PANEL_CLASS =
  "admin-modal-panel rounded-2xl border border-gray-100 dark:border-white/10 text-gray-900 dark:text-gray-100";

export const ADMIN_MODAL_PANEL_STYLE = {
  boxShadow: "0 24px 64px rgba(30,43,107,0.16), 0 8px 24px rgba(0,0,0,0.08)",
} as const;
