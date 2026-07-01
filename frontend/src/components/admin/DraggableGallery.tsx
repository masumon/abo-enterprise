"use client";

import { useState, useCallback } from "react";
import { GripVertical, Trash2, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface GalleryItem {
  id: string;
  url: string;
  alt?: string;
  sortOrder?: number;
}

interface DraggableGalleryProps {
  items: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
  onDelete?: (id: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export default function DraggableGallery({
  items,
  onChange,
  onDelete,
  disabled = false,
  className,
}: DraggableGalleryProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = items.findIndex((i) => i.id === draggedId);
    const targetIndex = items.findIndex((i) => i.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    const reordered = newItems.map((item, idx) => ({
      ...item,
      sortOrder: idx,
    }));

    onChange(reordered);
    setDraggedId(null);
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    setDeleting(id);
    try {
      await onDelete(id);
      const filtered = items.filter((i) => i.id !== id);
      onChange(filtered);
    } finally {
      setDeleting(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No images in gallery</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            draggable={!disabled}
            onDragStart={() => handleDragStart(item.id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(item.id)}
            className={cn(
              "relative rounded-lg overflow-hidden group cursor-move",
              "border border-gray-200 hover:border-brand-400 transition-all",
              "bg-gray-50 aspect-square flex items-center justify-center",
              draggedId === item.id && "opacity-50 border-dashed border-brand-400",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Image
              src={item.url}
              alt={item.alt || "Gallery item"}
              fill
              className="object-cover"
            />

            {/* Drag handle */}
            {!disabled && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <GripVertical className="w-5 h-5 text-white" />
              </div>
            )}

            {/* Delete button */}
            {onDelete && !disabled && (
              <button
                onClick={() => handleDelete(item.id)}
                disabled={deleting === item.id}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete image"
              >
                {deleting === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Sort order badge */}
            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-medium">
              {(item.sortOrder ?? items.indexOf(item)) + 1}
            </div>
          </div>
        ))}
      </div>

      {!disabled && (
        <p className="text-xs text-gray-500 text-center">
          Drag to reorder • Click delete to remove
        </p>
      )}
    </div>
  );
}
