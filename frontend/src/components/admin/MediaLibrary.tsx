"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Grid, List, FolderPlus } from "lucide-react";
import Image from "next/image";
import { adminApi } from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: string;
  url: string;
  name: string;
  size: number;
  uploaded_at: string;
  type: "image" | "video";
}

interface MediaLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (url: string) => void;
  folder?: string;
  multiSelect?: boolean;
}

export default function MediaLibrary({
  isOpen,
  onClose,
  onSelect,
  folder = "abo-enterprise/uploads",
  multiSelect = false,
}: MediaLibraryProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const toast = useToastStore((s) => s.push);

  useEffect(() => {
    if (isOpen) {
      loadMedia();
    }
  }, [isOpen, folder]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listMedia(folder);
      setItems(res.data.data || []);
      setSelected([]);
    } catch (err) {
      toast("error", "Failed to load media");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (url: string) => {
    if (multiSelect) {
      setSelected((prev) =>
        prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
      );
    } else {
      onSelect?.(url);
      onClose();
    }
  };

  const handleConfirm = () => {
    if (multiSelect && selected.length > 0) {
      selected.forEach((url) => onSelect?.(url));
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Media Library</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "p-2 rounded",
                view === "grid"
                  ? "bg-brand-100 text-brand-600"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-2 rounded",
                view === "list"
                  ? "bg-brand-100 text-brand-600"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-gray-600">
            {items.length} items {multiSelect && `• ${selected.length} selected`}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FolderPlus className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No media files yet</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.url)}
                  className={cn(
                    "relative rounded-lg overflow-hidden cursor-pointer group",
                    "border-2 transition-all",
                    selected.includes(item.url)
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  {item.type === "image" ? (
                    <Image
                      src={item.url}
                      alt={item.name}
                      width={200}
                      height={200}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-900 flex items-center justify-center text-white text-sm">
                      Video
                    </div>
                  )}
                  {selected.includes(item.url) && (
                    <div className="absolute inset-0 bg-brand-600/20 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-brand-600 border-2 border-white flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                    {item.name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.url)}
                  className={cn(
                    "flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors",
                    selected.includes(item.url)
                      ? "bg-brand-50"
                      : "hover:bg-gray-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(item.url)}
                    onChange={() => {}}
                    className="cursor-pointer"
                  />
                  <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {item.type === "image" ? (
                      <Image
                        src={item.url}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">Video</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(item.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(item.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Cancel
          </button>
          {multiSelect && (
            <button
              onClick={handleConfirm}
              disabled={selected.length === 0}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium disabled:opacity-50"
            >
              Select {selected.length > 0 && `(${selected.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
