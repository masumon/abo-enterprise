import type { Metadata } from "next";
import AdminLayoutClient from "./AdminLayoutClient";

/**
 * Server-render the ADMIN PWA manifest for every /sumon route. This overrides
 * the customer manifest (app/manifest.ts → /manifest.webmanifest) for this
 * subtree, so the admin app — start_url /sumon — is the ONLY thing Chrome can
 * install from inside the admin panel. Doing it in server metadata (not a
 * client-side <link> swap) is what makes it reliable: the link is in the very
 * first paint, before the browser fires beforeinstallprompt, so the deferred
 * prompt is bound to the admin manifest and never the customer one.
 */
export const metadata: Metadata = {
  manifest: "/admin.webmanifest",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
