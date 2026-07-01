"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, Loader2, AlertCircle } from "lucide-react";
import { useToastStore } from "@/store/toast";
import JsonFormEditor from "./JsonFormEditor";

interface AssetSpec {
  id: string;
  name: string;
  category: "hero" | "product" | "thumbnail" | "og" | "icon" | "banner" | "other";
  recommendedWidth: number;
  recommendedHeight: number;
  aspectRatio: string;
  formats: string[];
  maxFileSize: number;
  minFileSize: number;
  description: string;
}

const DEFAULT_SPECS: AssetSpec[] = [
  {
    id: "hero-banner",
    name: "Hero Banner",
    category: "hero",
    recommendedWidth: 1920,
    recommendedHeight: 600,
    aspectRatio: "16:5",
    formats: ["webp", "jpg", "png"],
    maxFileSize: 500 * 1024,
    minFileSize: 100 * 1024,
    description: "Full-width homepage hero image",
  },
  {
    id: "product-main",
    name: "Product Main Image",
    category: "product",
    recommendedWidth: 1000,
    recommendedHeight: 1000,
    aspectRatio: "1:1",
    formats: ["webp", "jpg"],
    maxFileSize: 300 * 1024,
    minFileSize: 50 * 1024,
    description: "Primary product display image",
  },
  {
    id: "thumbnail",
    name: "Thumbnail",
    category: "thumbnail",
    recommendedWidth: 300,
    recommendedHeight: 300,
    aspectRatio: "1:1",
    formats: ["webp", "jpg"],
    maxFileSize: 100 * 1024,
    minFileSize: 20 * 1024,
    description: "Grid/list view thumbnail",
  },
  {
    id: "og-landscape",
    name: "OG Image (Landscape)",
    category: "og",
    recommendedWidth: 1200,
    recommendedHeight: 630,
    aspectRatio: "1.91:1",
    formats: ["webp", "jpg"],
    maxFileSize: 200 * 1024,
    minFileSize: 50 * 1024,
    description: "Social media preview - landscape",
  },
  {
    id: "og-square",
    name: "OG Image (Square)",
    category: "og",
    recommendedWidth: 800,
    recommendedHeight: 800,
    aspectRatio: "1:1",
    formats: ["webp", "jpg"],
    maxFileSize: 200 * 1024,
    minFileSize: 50 * 1024,
    description: "Social media preview - square",
  },
  {
    id: "app-icon-192",
    name: "App Icon (192×192)",
    category: "icon",
    recommendedWidth: 192,
    recommendedHeight: 192,
    aspectRatio: "1:1",
    formats: ["png", "webp"],
    maxFileSize: 100 * 1024,
    minFileSize: 10 * 1024,
    description: "Android app icon",
  },
];

export default function AssetRegistry() {
  const [specs, setSpecs] = useState<AssetSpec[]>(DEFAULT_SPECS);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const toast = useToastStore((s) => s.push);

  const handleAddSpec = () => {
    const newSpec: AssetSpec = {
      id: `spec-${Date.now()}`,
      name: "New Asset Type",
      category: "other",
      recommendedWidth: 800,
      recommendedHeight: 800,
      aspectRatio: "1:1",
      formats: ["jpg", "webp"],
      maxFileSize: 200 * 1024,
      minFileSize: 50 * 1024,
      description: "",
    };
    setSpecs([...specs, newSpec]);
    setEditing(newSpec.id);
    setShowForm(true);
  };

  const handleUpdateSpec = (id: string, updates: Partial<AssetSpec>) => {
    setSpecs((prev) =>
      prev.map((spec) => (spec.id === id ? { ...spec, ...updates } : spec))
    );
    toast("success", "Specification updated");
    setEditing(null);
  };

  const handleDeleteSpec = (id: string) => {
    if (DEFAULT_SPECS.find((s) => s.id === id)) {
      toast("error", "Cannot delete default specifications");
      return;
    }
    setSpecs((prev) => prev.filter((spec) => spec.id !== id));
    toast("success", "Specification deleted");
  };

  const editingSpec = specs.find((s) => s.id === editing);

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <p className="font-medium mb-1">Asset Registry</p>
            <p className="opacity-90">
              Define recommended dimensions, formats, and file sizes for different asset types. Helps maintain consistent visual quality across the platform.
            </p>
          </div>
        </div>
      </div>

      {showForm && editingSpec && editing ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Edit Specification
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setShowForm(false);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Name
              </label>
              <input
                type="text"
                value={editingSpec.name}
                onChange={(e) =>
                  handleUpdateSpec(editing!, { name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Category
              </label>
              <select
                value={editingSpec.category}
                onChange={(e) =>
                  handleUpdateSpec(editing!, {
                    category: e.target.value as AssetSpec["category"],
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
              >
                <option value="hero">Hero/Banner</option>
                <option value="product">Product</option>
                <option value="thumbnail">Thumbnail</option>
                <option value="og">Social Media (OG)</option>
                <option value="icon">Icon</option>
                <option value="banner">Page Banner</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Recommended Width
              </label>
              <input
                type="number"
                value={editingSpec.recommendedWidth}
                onChange={(e) =>
                  handleUpdateSpec(editing!, {
                    recommendedWidth: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Recommended Height
              </label>
              <input
                type="number"
                value={editingSpec.recommendedHeight}
                onChange={(e) =>
                  handleUpdateSpec(editing!, {
                    recommendedHeight: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Aspect Ratio
              </label>
              <input
                type="text"
                value={editingSpec.aspectRatio}
                placeholder="e.g., 16:9"
                onChange={(e) =>
                  handleUpdateSpec(editing!, { aspectRatio: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Formats (comma-separated)
              </label>
              <input
                type="text"
                value={editingSpec.formats.join(", ")}
                onChange={(e) =>
                  handleUpdateSpec(editing!, {
                    formats: e.target.value
                      .split(",")
                      .map((f) => f.trim()),
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Description
              </label>
              <textarea
                aria-label="Description"
                value={editingSpec.description}
                onChange={(e) =>
                  handleUpdateSpec(editing!, { description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400 resize-none"
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Asset Specifications
            </h3>
            <button
              type="button"
              onClick={handleAddSpec}
              className="flex items-center gap-2 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" />
              Add Specification
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {specs.map((spec) => (
              <div
                key={spec.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {spec.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {spec.recommendedWidth}×{spec.recommendedHeight} •{" "}
                    {spec.aspectRatio} • {spec.formats.join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(spec.id);
                      setShowForm(true);
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSpec(spec.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
