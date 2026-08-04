/** Shared modal backdrop/panel styles — previously copy-pasted as an
 * inline style object across ~14 admin pages. One definition now. */
export const ADMIN_MODAL_BACKDROP_STYLE = {
  background: "rgba(0,0,0,0.5)",
  backdropFilter: "blur(4px)",
} as const;

export const ADMIN_MODAL_PANEL_STYLE = {
  background: "rgba(255,255,255,0.98)",
  boxShadow: "0 24px 64px rgba(30,43,107,0.16), 0 8px 24px rgba(0,0,0,0.08)",
} as const;
