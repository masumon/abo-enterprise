"use client";

import { useState } from "react";
import { AlertCircle, Check, X, Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/toast";

interface BrandStandard {
  category: string;
  rule: string;
  example: string;
  enforced: boolean;
}

const BRAND_STANDARDS: BrandStandard[] = [
  {
    category: "Color Palette",
    rule: "Use only brand colors: Primary (#1e40af), Secondary (#059669), Accent (#f97316)",
    example: "Primary: Hero banners, CTAs. Secondary: Success states. Accent: Highlights",
    enforced: true,
  },
  {
    category: "Typography",
    rule: "Headlines: Inter Bold, Body: Inter Regular, Min size: 12px",
    example: "H1: 32px • H2: 24px • Body: 14px • Small: 12px",
    enforced: true,
  },
  {
    category: "Images",
    rule: "Minimum 100×100px, Maximum 5000×5000px, Supported: WebP, AVIF, JPG, PNG",
    example: "Hero: 1920×600 (16:5) • Product: 1000×1000 (1:1) • Thumbnail: 300×300",
    enforced: true,
  },
  {
    category: "Icons",
    rule: "Use Lucide icons only, Size: 16-24px, Stroke: 2px",
    example: "Navigation: 20px • Inline: 16px • Large UI: 24-32px",
    enforced: true,
  },
  {
    category: "Spacing",
    rule: "Use 8px grid system: 8, 16, 24, 32, 40, 48, 56, 64px",
    example: "Padding: 16px • Margin: 24px • Gap: 12px between items",
    enforced: true,
  },
  {
    category: "Shadows",
    rule: "Subtle: 0 1px 2px rgba(0,0,0,0.05) • Medium: 0 4px 6px rgba(0,0,0,0.1)",
    example: "Cards: Medium • Modals: Large • Inputs: Subtle",
    enforced: false,
  },
  {
    category: "Accessibility",
    rule: "WCAG AA minimum (4.5:1 contrast), Alt text required for images",
    example: "Text on bg: min 4.5:1 ratio • Images: descriptive alt text",
    enforced: true,
  },
  {
    category: "Performance",
    rule: "Images optimized to WebP, LCP < 2.5s, CLS < 0.1",
    example: "Use Cloudinary transform URLs • Lazy load non-critical images",
    enforced: true,
  },
];

export default function BrandStyleGuide() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const toast = useToastStore((s) => s.push);

  const handleCopyRule = (rule: string) => {
    navigator.clipboard.writeText(rule);
    toast("success", "Copied to clipboard");
  };

  const handleDownloadGuide = () => {
    const content = BRAND_STANDARDS.map(
      (s) => `# ${s.category}\n\n${s.rule}\n\nExample: ${s.example}\n\n`
    ).join("\n---\n\n");

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brand-style-guide.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const enforcedCount = BRAND_STANDARDS.filter((s) => s.enforced).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Brand Style Guide</h2>
          <p className="text-gray-600">
            Enforce consistent visual assets across the platform
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-semibold uppercase">
              Total Standards
            </p>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {BRAND_STANDARDS.length}
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-600 font-semibold uppercase">
              Enforced
            </p>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {enforcedCount}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-600 font-semibold uppercase">
              Optional
            </p>
            <p className="text-2xl font-bold text-amber-900 mt-1">
              {BRAND_STANDARDS.length - enforcedCount}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadGuide}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Guide (Markdown)
        </button>
      </div>

      {/* Standards List */}
      <div className="space-y-2">
        {BRAND_STANDARDS.map((standard, idx) => (
          <div
            key={idx}
            className={cn(
              "border rounded-lg overflow-hidden transition-all",
              expandedIdx === idx
                ? "border-brand-400 bg-brand-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            {/* Header */}
            <button
              type="button"
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-gray-900">
                    {standard.category}
                  </span>
                  {standard.enforced && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                      Enforced
                    </span>
                  )}
                  {!standard.enforced && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-1">
                  {standard.rule}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                {expandedIdx === idx ? (
                  <X className="w-4 h-4 text-gray-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>

            {/* Content */}
            {expandedIdx === idx && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1.5">
                    Standard
                  </p>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-900 flex-1">
                      {standard.rule}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopyRule(standard.rule)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1.5">
                    Example Usage
                  </p>
                  <div className="bg-white border border-gray-200 rounded px-3 py-2">
                    <p className="text-sm text-gray-700">{standard.example}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {standard.enforced
                      ? "Assets must comply with this standard"
                      : "Recommended but not strictly enforced"}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Compliance Checker */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-blue-900 mb-2">
            Automated Compliance Checking
          </h3>
          <p className="text-sm text-blue-800">
            Enable automatic validation when uploading new assets to ensure they meet brand standards.
          </p>
        </div>

        <div className="space-y-2">
          {[
            { label: "Check image dimensions", key: "dimensions" },
            { label: "Validate color palette", key: "colors" },
            { label: "Verify text contrast (WCAG)", key: "contrast" },
            { label: "Warn on performance issues", key: "performance" },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-3 p-2 hover:bg-blue-100 rounded cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4 rounded border-blue-300 text-blue-600"
              />
              <span className="text-sm text-blue-900">{item.label}</span>
            </label>
          ))}
        </div>

        <button type="button" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
          Save Compliance Settings
        </button>
      </div>
    </div>
  );
}
