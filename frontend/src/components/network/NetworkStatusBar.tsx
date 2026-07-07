"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { isOffline } from "@/lib/networkStatus";

export default function NetworkStatusBar() {
  const [isOff, setIsOff] = useState(false);

  useEffect(() => {
    setIsOff(isOffline());
    const handleOnline = () => setIsOff(false);
    const handleOffline = () => setIsOff(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Only show for genuine loss of connectivity — cellular/slow-network
  // nagging fired on nearly every mobile visitor in Bangladesh and added
  // no value, so it was removed. Being offline is worth interrupting for.
  if (!isOff) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 px-4 py-3 text-center text-sm font-medium transition-all duration-300 bg-red-50 text-red-700 border-b border-red-200">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span>আপনি অফলাইন আছেন — সীমিত কার্যকারিতা উপলব্ধ</span>
      </div>
    </div>
  );
}
