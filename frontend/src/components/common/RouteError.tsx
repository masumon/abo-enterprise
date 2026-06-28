"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
}

export default function RouteError({
  error,
  reset,
  title = "Something went wrong",
  message = "একটি সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।",
}: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> পুনরায় চেষ্টা
          </button>
          <a
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" /> হোম
          </a>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-gray-400">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
