"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, ImageOff, X } from "lucide-react";
import { ADMIN_MODAL_BACKDROP_STYLE, ADMIN_MODAL_PANEL_STYLE } from "@/lib/adminModalStyles";
import { adminApi, type MediaAssetRecord } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { isVideoUrl } from "@/lib/media";
import AutoVideo from "@/components/ui/AutoVideo";
import { useToastStore } from "@/store/toast";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface Props {
  open: boolean;
  onSelect: (url: string) => void;
  onClose: () => void;
  /** Filter the grid to a media kind — defaults to showing everything. */
  accept?: "image" | "video" | "both";
}

function Thumb({ url, className }: { url: string; className?: string }) {
  if (isVideoUrl(url)) return <AutoVideo src={url} className={className} />;
  // eslint-disable-next-line @next/next/no-img-element -- remote Cloudinary thumbnail
  return <img src={url} alt="" className={className} />;
}

/**
 * Lets an admin reuse an already-uploaded asset instead of re-uploading the
 * same image into every field. Opened from ImageUpload's "Browse Library" button.
 */
export default function MediaLibraryPicker({ open, onSelect, onClose, accept = "both" }: Props) {
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const toast = useToastStore((s) => s.push);
  const dialogRef = useFocusTrap(open, onClose);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const res = await adminApi.listMedia({ page: p, per_page: 24, search: q.trim() || undefined });
      const data = res.data.data ?? [];
      const filtered =
        accept === "both"
          ? data
          : data.filter((a) => (accept === "video" ? isVideoUrl(a.url) : !isVideoUrl(a.url)));
      setAssets(filtered);
      setTotalPages(res.data.meta?.total_pages ?? 1);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to load media library"));
    } finally {
      setLoading(false);
    }
  }, [accept, toast]);

  useEffect(() => {
    if (open) {
      setPage(1);
      void load(1, search);
    }
    // Only reload on open/close transitions — search/page have explicit triggers below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={ADMIN_MODAL_BACKDROP_STYLE}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Media library"
        className="rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-scale-in"
        style={ADMIN_MODAL_PANEL_STYLE}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-white/10 shrink-0">
          <h2 className="text-base font-semibold text-heading">Media Library — select to reuse</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/10 shrink-0">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { setPage(1); void load(1, search); }
              }}
              placeholder="Search by filename…"
              className="input pl-9 w-full text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <ImageOff className="w-8 h-8" />
              <p className="text-sm">No matching media found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => { onSelect(asset.url); onClose(); }}
                  title={asset.filename}
                  className="group rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 hover:border-brand-400 hover:ring-2 hover:ring-brand-200 transition-all text-left"
                >
                  <div className="aspect-square bg-gray-50 dark:bg-white/5 overflow-hidden">
                    <Thumb url={asset.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <p className="px-2 py-1.5 text-[11px] text-gray-600 dark:text-gray-300 truncate">{asset.filename}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-gray-100 dark:border-white/10 shrink-0">
            <button
              type="button"
              disabled={page === 1 || loading}
              onClick={() => { const p = page - 1; setPage(p); void load(p, search); }}
              className="btn btn-outline btn-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300">Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => { const p = page + 1; setPage(p); void load(p, search); }}
              className="btn btn-outline btn-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
