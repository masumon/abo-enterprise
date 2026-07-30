import { permanentRedirect } from "next/navigation";

/**
 * GAP-10 — /register and /login rendered the same CustomerOtpForm against the
 * same endpoint: there was never a separate registration flow, only two doors
 * into one. Two doors made the visitor choose before they had anything to
 * choose between, and the "Create Account" heading implied a step that does
 * not exist — the account is created on first verified OTP either way.
 *
 * The redirect is permanent and server-side so external links and search
 * engines carry their equity to /login. next.config.js carries the same rule
 * at the edge; this file keeps the route correct if it is ever reached
 * directly, and keeps the path from 404-ing.
 */
export default function RegisterPage(): never {
  permanentRedirect("/login");
}
