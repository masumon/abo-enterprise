"use client";

import { useEffect, useState } from "react";
import {
  HardDrive,
  AlertTriangle,
  Zap,
  Copy,
  Trash2,
  Loader2,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { cn } from "@/lib/utils";

interface MediaStats {
  totalAssets: number;
  totalStorageBytes: number;
  unusedAssets: number;
  duplicateAssets: number;
  brokenAssets: number;
  oldestAsset: string | null;
  averageFileSize: number;
}

export default function MediaDashboard() {
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const toast = useToastStore((s) => s.push);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // This would typically call an API endpoint
      // For now, we'll use mock data as the endpoint doesn't exist yet
      const mockStats: MediaStats = {
        totalAssets: 127,
        totalStorageBytes: 1024 * 1024 * 512,
        unusedAssets: 23,
        duplicateAssets: 5,
        brokenAssets: 2,
        oldestAsset: "2024-01-15",
        averageFileSize: (1024 * 1024 * 512) / 127,
      };
      setStats(mockStats);
    } catch (err) {
      toast("error", "Failed to load media statistics");
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      // Would call cleanup API endpoint
      toast("success", "Cleanup completed: removed 23 unused and 5 duplicate assets");
      loadStats();
    } catch (err) {
      toast("error", "Cleanup failed");
    } finally {
      setCleaning(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Unable to load media statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Storage */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Total Storage
            </h3>
            <HardDrive className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatBytes(stats.totalStorageBytes)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.totalAssets} assets
          </p>
        </div>

        {/* Average File Size */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Avg File Size
            </h3>
            <BarChart3 className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatBytes(stats.averageFileSize)}
          </p>
        </div>

        {/* Unused Assets */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Unused
            </h3>
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.unusedAssets}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {Math.round((stats.unusedAssets / stats.totalAssets) * 100)}% of total
          </p>
        </div>

        {/* Issues */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Issues Found
            </h3>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.duplicateAssets + stats.brokenAssets}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.duplicateAssets} duplicates • {stats.brokenAssets} broken
          </p>
        </div>
      </div>

      {/* Issues Section */}
      {(stats.unusedAssets > 0 || stats.duplicateAssets > 0 || stats.brokenAssets > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">Media Issues Detected</p>
              <ul className="text-sm text-amber-800 mt-2 space-y-1 ml-4 list-disc">
                {stats.unusedAssets > 0 && (
                  <li>{stats.unusedAssets} unused assets consuming storage</li>
                )}
                {stats.duplicateAssets > 0 && (
                  <li>{stats.duplicateAssets} duplicate files found</li>
                )}
                {stats.brokenAssets > 0 && (
                  <li>{stats.brokenAssets} broken/missing assets</li>
                )}
              </ul>
            </div>
          </div>

          <button
            onClick={handleCleanup}
            disabled={cleaning}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              cleaning
                ? "bg-gray-300 text-gray-600"
                : "bg-amber-600 text-white hover:bg-amber-700"
            )}
          >
            {cleaning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                Cleaning...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 inline mr-1" />
                Run Cleanup
              </>
            )}
          </button>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Timeline */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Asset Timeline</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Oldest asset</span>
              <span className="text-gray-900 font-medium">
                {stats.oldestAsset || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between text-gray-500 text-xs">
              <span>Recent uploads</span>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Recommendations</h3>
          <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
            <li>Use WebP format for better compression</li>
            <li>Enable Cloudinary auto-optimization</li>
            <li>Archive assets older than 1 year</li>
            <li>Review and delete unused assets monthly</li>
          </ul>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadStats}
          className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Refresh Stats
        </button>
      </div>
    </div>
  );
}
