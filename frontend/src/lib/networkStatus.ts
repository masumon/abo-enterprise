export type NetworkQuality = "online" | "offline" | "slow";

interface NetworkInformation {
  effectiveType?: string;
  saveData?: boolean;
  /** "cellular" on mobile data — common in Bangladesh */
  type?: string;
}

function getConnection(): NetworkInformation | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
}

/** True when the browser reports no connectivity. */
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/** True when on mobile data (cellular) — primary network for BD users. */
export function isCellularNetwork(): boolean {
  return getConnection()?.type === "cellular";
}

/** Heuristic for slow mobile data (2G/3G / save-data). */
export function isSlowConnection(): boolean {
  const conn = getConnection();
  if (!conn) return false;
  if (conn.saveData) return true;
  const et = conn.effectiveType ?? "";
  return et === "slow-2g" || et === "2g" || et === "3g";
}

/** Cellular or slow link — prefer cache and shorter API timeouts. */
export function isConstrainedNetwork(): boolean {
  if (isOffline()) return true;
  return isCellularNetwork() || isSlowConnection();
}

export function getNetworkQuality(): NetworkQuality {
  if (isOffline()) return "offline";
  if (isConstrainedNetwork()) return "slow";
  return "online";
}
