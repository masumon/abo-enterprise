import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-blue-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-brand-200 mb-4 select-none">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">পেজটি পাওয়া যায়নি</h1>
        <p className="text-gray-500 mb-8 text-sm">Page not found. The link may be broken or the page may have been removed.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors">
            <Home className="w-4 h-4" /> হোমপেজ
          </Link>
          <Link href="/products" className="flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            <Search className="w-4 h-4" /> পণ্য খুঁজুন
          </Link>
        </div>
      </div>
    </div>
  );
}
