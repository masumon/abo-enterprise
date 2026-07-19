"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  /** Path (or absolute URL) the QR should resolve to, e.g. "/orders/ABC123". */
  path: string;
  /** Small caption under the QR. */
  label?: string;
  size?: number;
}

/**
 * Invoice verification QR. Encodes an absolute URL to the live order/invoice
 * page so a customer can scan the printed or on-screen receipt and open the
 * real record. The absolute URL is resolved from the browser origin after
 * mount to avoid an SSR/hydration mismatch; until then nothing renders (the QR
 * is a progressive enhancement, never required for the invoice to be valid).
 */
export default function InvoiceQr({ path, label, size = 76 }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      setUrl(new URL(path, window.location.origin).toString());
    } catch {
      setUrl(null);
    }
  }, [path]);

  if (!url) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-white p-1.5 rounded-lg ring-1 ring-gray-200">
        <QRCodeSVG value={url} size={size} level="M" marginSize={1} />
      </div>
      {label && (
        <span className="text-[9px] text-muted text-center leading-tight max-w-[96px]">
          {label}
        </span>
      )}
    </div>
  );
}
